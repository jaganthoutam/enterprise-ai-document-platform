import json
import os
import boto3
import logging
import uuid
import time
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
bedrock_runtime = boto3.client('bedrock-runtime')
bedrock_agent = boto3.client('bedrock-agent')
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Environment variables
KNOWLEDGE_BASE_ID = os.environ.get('KNOWLEDGE_BASE_ID')
DOCUMENT_BUCKET = os.environ.get('DOCUMENT_BUCKET')
DYNAMODB_TABLE = os.environ.get('DYNAMODB_TABLE')
MODEL_ID = os.environ.get('MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
AGENT_ID = os.environ.get('AGENT_ID')

# DynamoDB table
table = dynamodb.Table(DYNAMODB_TABLE)

def lambda_handler(event, context):
    """
    Lambda handler for AI service
    """
    logger.info(f"Event received: {json.dumps(event)}")
    
    try:
        # Get HTTP method and path
        http_method = event.get('httpMethod')
        path = event.get('path', '')
        
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # Get user ID from Cognito authorizer
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        claims = authorizer.get('claims', {})
        user_id = claims.get('sub')
        
        # Route request based on path
        if 'chat' in path:
            return handle_chat(body, user_id)
        elif 'analyze' in path:
            return handle_document_analysis(body, user_id)
        elif 'search' in path:
            return handle_knowledge_search(body, user_id)
        else:
            return format_response(400, {'message': 'Invalid endpoint'})
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return format_response(500, {'message': 'Internal server error', 'error': str(e)})

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
        
        # Log the conversation
        conversation_id = request_data.get('conversationId', str(uuid.uuid4()))
        log_conversation(user_id, conversation_id, messages[-1]['content'], 'user')
        
        # Use Bedrock Agent or direct model invocation
        if use_agent and AGENT_ID:
            response = invoke_bedrock_agent(messages, conversation_id)
        else:
            response = invoke_claude_model(messages, model_params)
        
        # Log the assistant's response
        assistant_message = response.get('message', response.get('content', ''))
        log_conversation(user_id, conversation_id, assistant_message, 'assistant')
        
        return format_response(200, response)
    
    except Exception as e:
        logger.error(f"Error in chat handling: {str(e)}")
        return format_response(500, {'message': 'Error processing chat request', 'error': str(e)})

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
        
        # Get document metadata from DynamoDB
        document = get_document_metadata(document_id)
        
        if not document:
            return format_response(404, {'message': 'Document not found'})
            
        # Check document access permissions
        if document.get('userId') != user_id and document.get('access') != 'public':
            return format_response(403, {'message': 'Access denied to this document'})
        
        # Get document content from S3
        document_content = get_document_content(document.get('s3Key'))
        
        if not document_content:
            return format_response(500, {'message': 'Error retrieving document content'})
        
        # Create analysis prompt based on options
        analysis_type = options.get('analysisType', 'summary')
        prompt = create_analysis_prompt(document, document_content, analysis_type, options)
        
        # Invoke Claude for analysis
        messages = [
            {'role': 'user', 'content': prompt}
        ]
        model_params = {
            'temperature': 0.3,
            'max_tokens': 4000
        }
        
        response = invoke_claude_model(messages, model_params)
        
        # Store analysis results
        analysis_id = str(uuid.uuid4())
        store_analysis_results(user_id, document_id, analysis_id, analysis_type, response)
        
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
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': True,
        },
        'body': json.dumps(body)
    }
