import json
import os
import boto3
import logging
import uuid
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from botocore.exceptions import ClientError
from functools import wraps
from time import sleep

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Set AWS region
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
os.environ['AWS_DEFAULT_REGION'] = AWS_REGION

# Rate limiting configuration
RATE_LIMIT = int(os.environ.get('RATE_LIMIT', 10))  # requests per minute
RATE_LIMIT_WINDOW = 60  # seconds
request_timestamps = {}

def rate_limit(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        current_time = time.time()
        user_id = kwargs.get('user_id') or args[1] if len(args) > 1 else None
        
        if user_id:
            if user_id not in request_timestamps:
                request_timestamps[user_id] = []
            
            # Remove timestamps older than the window
            request_timestamps[user_id] = [
                ts for ts in request_timestamps[user_id]
                if current_time - ts < RATE_LIMIT_WINDOW
            ]
            
            if len(request_timestamps[user_id]) >= RATE_LIMIT:
                sleep_time = RATE_LIMIT_WINDOW - (current_time - request_timestamps[user_id][0])
                if sleep_time > 0:
                    sleep(sleep_time)
            
            request_timestamps[user_id].append(current_time)
        
        return func(*args, **kwargs)
    return wrapper

# Initialize AWS clients
def init_aws_clients():
    try:
        bedrock_runtime = boto3.client('bedrock-runtime', region_name=AWS_REGION)
        bedrock_agent = boto3.client('bedrock-agent', region_name=AWS_REGION)
        s3 = boto3.client('s3', region_name=AWS_REGION)
        dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
        return bedrock_runtime, bedrock_agent, s3, dynamodb
    except ClientError as e:
        logger.error(f"Error initializing AWS clients: {str(e)}")
        raise

# Initialize clients only if not running tests
if 'PYTEST_CURRENT_TEST' not in os.environ:
    bedrock_runtime, bedrock_agent, s3, dynamodb = init_aws_clients()
    
    # Environment variables
    KNOWLEDGE_BASE_ID = os.environ.get('KNOWLEDGE_BASE_ID')
    DOCUMENT_BUCKET = os.environ.get('DOCUMENT_BUCKET')
    DYNAMODB_TABLE = os.environ.get('DYNAMODB_TABLE', 'ai-service-table')
    MODEL_ID = os.environ.get('MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
    AGENT_ID = os.environ.get('AGENT_ID')

    # DynamoDB table
    try:
        table = dynamodb.Table(DYNAMODB_TABLE)
        # Verify table exists and is accessible
        if 'PYTEST_CURRENT_TEST' not in os.environ:
            table.load()
    except ClientError as e:
        logger.error(f"Error accessing DynamoDB table: {str(e)}")
        raise

# Health check server
class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')

def run_health_server():
    server = HTTPServer(('', 3000), HealthCheckHandler)
    server.serve_forever()

def create_table_if_not_exists():
    try:
        table = dynamodb.create_table(
            TableName=DYNAMODB_TABLE,
            KeySchema=[
                {
                    'AttributeName': 'id',
                    'KeyType': 'HASH'
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'id',
                    'AttributeType': 'S'
                }
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        table.wait_until_exists()
        logger.info(f"Created table {DYNAMODB_TABLE}")
        return table
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            logger.info(f"Table {DYNAMODB_TABLE} already exists")
            return dynamodb.Table(DYNAMODB_TABLE)
        else:
            logger.error(f"Error creating table: {str(e)}")
            raise

def lambda_handler(event, context):
    """
    Lambda handler for AI service
    """
    logger.info(f"Event received: {json.dumps(event)}")
    
    try:
        # Create or get the DynamoDB table
        table = create_table_if_not_exists()
        
        # Get HTTP method and path
        http_method = event.get('httpMethod')
        path = event.get('path', '')
        
        # Parse request body
        try:
            body = json.loads(event.get('body', '{}'))
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in request body: {str(e)}")
            return format_response(400, {'message': 'Invalid JSON in request body'})
        
        # Get user ID from Cognito authorizer
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        claims = authorizer.get('claims', {})
        user_id = claims.get('sub')
        
        if not user_id:
            logger.warning("No user ID found in request context")
            return format_response(401, {'message': 'Unauthorized'})
        
        # Route request based on path
        if 'chat' in path:
            return handle_chat(body, user_id)
        elif 'analyze' in path:
            return handle_document_analysis(body, user_id)
        elif 'search' in path:
            return handle_knowledge_search(body, user_id)
        else:
            logger.warning(f"Invalid endpoint requested: {path}")
            return format_response(400, {'message': 'Invalid endpoint'})
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        return format_response(500, {'message': 'Internal server error', 'error': str(e)})

@rate_limit
def handle_chat(request_data, user_id):
    """
    Handle chat requests using Claude model
    
    Args:
        request_data (dict): Request data containing messages
        user_id (str): Cognito user ID
        
    Returns:
        dict: API Gateway response
    """
    try:
        messages = request_data.get('messages', [])
        model_params = request_data.get('parameters', {})
        use_agent = request_data.get('useAgent', False)
        
        if not messages:
            return format_response(400, {'message': 'No messages provided'})
        
        # Validate model parameters
        if model_params:
            if 'temperature' in model_params and not 0 <= model_params['temperature'] <= 1:
                return format_response(400, {'message': 'Temperature must be between 0 and 1'})
            if 'max_tokens' in model_params and not 1 <= model_params['max_tokens'] <= 4000:
                return format_response(400, {'message': 'Max tokens must be between 1 and 4000'})
        
        # Log the conversation
        conversation_id = request_data.get('conversationId', str(uuid.uuid4()))
        log_conversation(user_id, conversation_id, messages[-1]['content'], 'user')
        
        try:
            # Use Bedrock Agent or direct model invocation
            if use_agent and AGENT_ID:
                response = invoke_bedrock_agent(messages, conversation_id)
            else:
                response = invoke_claude_model(messages, model_params)
        except ClientError as e:
            logger.error(f"Bedrock service error: {str(e)}")
            return format_response(503, {'message': 'AI service temporarily unavailable'})
        
        # Log the assistant's response
        assistant_message = response.get('message', response.get('content', ''))
        log_conversation(user_id, conversation_id, assistant_message, 'assistant')
        
        return format_response(200, response)
    
    except Exception as e:
        logger.error(f"Error in chat handling: {str(e)}")
        return format_response(500, {'message': 'Error processing chat request', 'error': str(e)})

@rate_limit
def handle_document_analysis(request_data, user_id):
    """
    Analyze a document using Claude
    
    Args:
        request_data (dict): Request data containing document ID and options
        user_id (str): Cognito user ID
        
    Returns:
        dict: API Gateway response
    """
    try:
        document_id = request_data.get('documentId')
        options = request_data.get('options', {})
        
        if not document_id:
            return format_response(400, {'message': 'Document ID is required'})
        
        # Validate analysis options
        analysis_type = options.get('analysisType', 'summary')
        if analysis_type not in ['summary', 'extract', 'classify', 'qa']:
            return format_response(400, {'message': 'Invalid analysis type'})
        
        # Get document metadata from DynamoDB
        try:
            document = get_document_metadata(document_id)
        except ClientError as e:
            logger.error(f"Error accessing document metadata: {str(e)}")
            return format_response(500, {'message': 'Error accessing document metadata'})
        
        if not document:
            return format_response(404, {'message': 'Document not found'})
            
        # Check document access permissions
        if document.get('userId') != user_id and document.get('access') != 'public':
            return format_response(403, {'message': 'Access denied to this document'})
        
        # Get document content from S3
        try:
            document_content = get_document_content(document.get('s3Key'))
        except ClientError as e:
            logger.error(f"Error retrieving document content: {str(e)}")
            return format_response(500, {'message': 'Error retrieving document content'})
        
        if not document_content:
            return format_response(500, {'message': 'Error retrieving document content'})
        
        # Create analysis prompt based on options
        prompt = create_analysis_prompt(document, document_content, analysis_type, options)
        
        # Invoke Claude for analysis
        messages = [
            {'role': 'user', 'content': prompt}
        ]
        model_params = {
            'temperature': 0.3,
            'max_tokens': 4000
        }
        
        try:
            response = invoke_claude_model(messages, model_params)
        except ClientError as e:
            logger.error(f"Bedrock service error: {str(e)}")
            return format_response(503, {'message': 'AI service temporarily unavailable'})
        
        # Store analysis results
        analysis_id = str(uuid.uuid4())
        try:
            store_analysis_results(user_id, document_id, analysis_id, analysis_type, response)
        except ClientError as e:
            logger.error(f"Error storing analysis results: {str(e)}")
            # Continue with response even if storage fails
        
        # Format response
        analysis_response = {
            'analysisId': analysis_id,
            'documentId': document_id,
            'analysisType': analysis_type,
            'result': response.get('content', ''),
            'timestamp': datetime.now().isoformat()
        }
        
        return format_response(200, analysis_response)
        
    except Exception as e:
        logger.error(f"Error in document analysis: {str(e)}")
        return format_response(500, {'message': 'Error analyzing document', 'error': str(e)})

def handle_knowledge_search(request_data, user_id):
    """
    Search the knowledge base
    
    Args:
        request_data (dict): Request data containing query and filters
        user_id (str): Cognito user ID
        
    Returns:
        dict: API Gateway response
    """
    try:
        query = request_data.get('query')
        filters = request_data.get('filters', {})
        
        if not query:
            return format_response(400, {'message': 'Search query is required'})
            
        if not KNOWLEDGE_BASE_ID:
            return format_response(500, {'message': 'Knowledge base not configured'})
        
        # Create attribute filter if specified
        attribute_filter = None
        if filters:
            filter_list = []
            for key, value in filters.items():
                if isinstance(value, list):
                    # For list values, create OR condition
                    or_conditions = [{'key': key, 'value': {'stringValue': v}} for v in value]
                    filter_list.append({'or': or_conditions})
                else:
                    filter_list.append({'equals': {'key': key, 'value': {'stringValue': value}}})
            
            if filter_list:
                attribute_filter = {'and': filter_list}
        
        # Search the knowledge base
        response = bedrock_agent.retrieve(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={
                'text': query
            },
            numberOfResults=10,
            attributeFilter=attribute_filter
        )
        
        # Format search results
        results = []
        for result in response.get('retrievalResults', []):
            content = result.get('content', {}).get('text', '')
            metadata = {}
            
            # Extract metadata
            for attribute in result.get('metadata', {}).get('attributes', []):
                metadata[attribute.get('key')] = attribute.get('value', {}).get('stringValue', '')
            
            results.append({
                'content': content,
                'metadata': metadata,
                'score': result.get('score', 0)
            })
        
        # Log the search query
        log_search_query(user_id, query, len(results))
        
        return format_response(200, {
            'query': query,
            'results': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in knowledge search: {str(e)}")
        return format_response(500, {'message': 'Error searching knowledge base', 'error': str(e)})

def invoke_claude_model(messages, model_params=None):
    """
    Invoke Claude model via Bedrock
    
    Args:
        messages (list): List of message objects
        model_params (dict): Model parameters
        
    Returns:
        dict: Model response
    """
    if model_params is None:
        model_params = {}
    
    # Set default parameters
    default_params = {
        'temperature': 0.7,
        'max_tokens': 2000,
        'top_p': 0.9,
        'anthropic_version': 'bedrock-2023-05-31'
    }
    
    # Merge with provided parameters
    params = {**default_params, **model_params}
    
    # Prepare request body
    request_body = {
        'anthropic_version': params.pop('anthropic_version'),
        'max_tokens': params.pop('max_tokens'),
        'messages': messages,
        **params
    }
    
    # Invoke the model
    response = bedrock_runtime.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps(request_body)
    )
    
    # Parse response
    response_body = json.loads(response['body'].read().decode('utf-8'))
    content = response_body.get('content', [])
    
    # Extract text from response
    result = ""
    for item in content:
        if item.get('type') == 'text':
            result += item.get('text', '')
    
    return {
        'content': result,
        'usage': response_body.get('usage', {}),
        'model': MODEL_ID
    }

def invoke_bedrock_agent(messages, session_id=None):
    """
    Invoke Bedrock Agent
    
    Args:
        messages (list): List of message objects
        session_id (str): Session ID for the conversation
        
    Returns:
        dict: Agent response
    """
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Convert messages to agent format
    input_text = messages[-1]['content']
    
    # Invoke the agent
    response = bedrock_agent.invoke_agent(
        agentId=AGENT_ID,
        agentAliasId='TSTALIASID',  # Replace with your alias ID
        sessionId=session_id,
        inputText=input_text
    )
    
    return {
        'message': response.get('completion', ''),
        'sessionId': session_id,
        'agentId': AGENT_ID,
        'sources': response.get('citations', [])
    }

def get_document_metadata(document_id):
    """
    Get document metadata from DynamoDB
    
    Args:
        document_id (str): Document ID
        
    Returns:
        dict: Document metadata
    """
    response = table.get_item(
        Key={
            'PK': f'DOC#{document_id}',
            'SK': 'METADATA'
        }
    )
    
    return response.get('Item')

def get_document_content(s3_key):
    """
    Get document content from S3
    
    Args:
        s3_key (str): S3 object key
        
    Returns:
        str: Document content
    """
    try:
        response = s3.get_object(
            Bucket=DOCUMENT_BUCKET,
            Key=s3_key
        )
        
        # Read content based on file type
        content_type = response.get('ContentType', '')
        
        if 'text' in content_type or 'json' in content_type:
            return response['Body'].read().decode('utf-8')
        elif 'pdf' in content_type:
            # In a real implementation, you would use a PDF parsing library
            return f"[PDF content from {s3_key}]"
        else:
            return f"[Binary content from {s3_key}]"
            
    except Exception as e:
        logger.error(f"Error getting document content: {str(e)}")
        return None

def create_analysis_prompt(document, content, analysis_type, options):
    """
    Create a prompt for document analysis
    
    Args:
        document (dict): Document metadata
        content (str): Document content
        analysis_type (str): Type of analysis
        options (dict): Analysis options
        
    Returns:
        str: Analysis prompt
    """
    prompts = {
        'summary': f"""Please provide a concise summary of the following document:
Title: {document.get('title')}
Type: {document.get('docType')}

DOCUMENT CONTENT:
{content}

Please summarize the key points in 3-5 bullets.""",

        'entities': f"""Please extract all important entities from the following document:
Title: {document.get('title')}
Type: {document.get('docType')}

DOCUMENT CONTENT:
{content}

Extract entities in these categories:
- People
- Organizations
- Locations
- Dates
- Key terms/concepts

Format your response as a structured list by category.""",

        'sentiment': f"""Please analyze the sentiment of the following document:
Title: {document.get('title')}
Type: {document.get('docType')}

DOCUMENT CONTENT:
{content}

Provide:
1. Overall sentiment (positive, negative, or neutral)
2. Confidence score (0-100%)
3. Brief explanation of your assessment
4. Key positive and negative elements if present""",

        'custom': options.get('customPrompt', f"""Analyze this document:
Title: {document.get('title')}
Type: {document.get('docType')}

DOCUMENT CONTENT:
{content}
""")
    }
    
    return prompts.get(analysis_type, prompts['summary'])

def store_analysis_results(user_id, document_id, analysis_id, analysis_type, results):
    """
    Store analysis results in DynamoDB
    
    Args:
        user_id (str): User ID
        document_id (str): Document ID
        analysis_id (str): Analysis ID
        analysis_type (str): Type of analysis
        results (dict): Analysis results
        
    Returns:
        None
    """
    timestamp = datetime.now().isoformat()
    
    item = {
        'PK': f'ANALYSIS#{analysis_id}',
        'SK': 'METADATA',
        'GSI1PK': user_id,
        'GSI1SK': timestamp,
        'GSI2PK': f'DOC#{document_id}',
        'GSI2SK': timestamp,
        'id': analysis_id,
        'documentId': document_id,
        'userId': user_id,
        'analysisType': analysis_type,
        'result': results.get('content', ''),
        'createdAt': timestamp,
        'modelId': results.get('model', MODEL_ID),
        'usage': results.get('usage', {})
    }
    
    table.put_item(Item=item)

def log_conversation(user_id, conversation_id, message, role):
    """
    Log conversation in DynamoDB
    
    Args:
        user_id (str): User ID
        conversation_id (str): Conversation ID
        message (str): Message content
        role (str): Message role (user/assistant)
        
    Returns:
        None
    """
    timestamp = datetime.now().isoformat()
    message_id = str(uuid.uuid4())
    
    item = {
        'PK': f'CONV#{conversation_id}',
        'SK': f'MSG#{timestamp}',
        'GSI1PK': user_id,
        'GSI1SK': timestamp,
        'id': message_id,
        'conversationId': conversation_id,
        'userId': user_id,
        'message': message,
        'role': role,
        'timestamp': timestamp,
        'ttl': int(time.time()) + (90 * 24 * 60 * 60)  # 90 days TTL
    }
    
    table.put_item(Item=item)

def log_search_query(user_id, query, result_count):
    """
    Log search query in DynamoDB
    
    Args:
        user_id (str): User ID
        query (str): Search query
        result_count (int): Number of results
        
    Returns:
        None
    """
    timestamp = datetime.now().isoformat()
    search_id = str(uuid.uuid4())
    
    item = {
        'PK': f'SEARCH#{search_id}',
        'SK': 'METADATA',
        'GSI1PK': user_id,
        'GSI1SK': timestamp,
        'id': search_id,
        'userId': user_id,
        'query': query,
        'resultCount': result_count,
        'timestamp': timestamp,
        'ttl': int(time.time()) + (30 * 24 * 60 * 60)  # 30 days TTL
    }
    
    table.put_item(Item=item)

def format_response(status_code, body):
    """
    Format response for API Gateway
    
    Args:
        status_code (int): HTTP status code
        body (dict): Response body
        
    Returns:
        dict: API Gateway response format
    """
    response = {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': True,
        },
        'body': json.dumps(body)
    }
    
    logger.info(f"Response: {json.dumps(response)}")
    return response

if __name__ == '__main__':
    import threading
    health_thread = threading.Thread(target=run_health_server, daemon=True)
    health_thread.start()
    
    # Your existing Lambda handler code here
    # ... rest of the existing code ...