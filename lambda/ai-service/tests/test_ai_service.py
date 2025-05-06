import pytest
import json
from unittest.mock import MagicMock, patch
import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock AWS clients before importing the module
mock_bedrock_runtime = MagicMock()
mock_bedrock_agent = MagicMock()
mock_s3 = MagicMock()
mock_dynamodb = MagicMock()
mock_table = MagicMock()

with patch('boto3.client') as mock_client, \
     patch('boto3.resource') as mock_resource:
    mock_client.return_value = mock_bedrock_runtime
    mock_resource.return_value = mock_dynamodb
    mock_dynamodb.Table.return_value = mock_table
    
    from ai_service_lambda import lambda_handler, handle_chat, handle_document_analysis, handle_knowledge_search

def test_lambda_handler_unauthorized():
    event = {
        'httpMethod': 'POST',
        'path': '/chat',
        'body': json.dumps({'messages': [{'role': 'user', 'content': 'Hello'}]}),
        'requestContext': {
            'authorizer': {
                'claims': {}
            }
        }
    }
    
    response = lambda_handler(event, {})
    assert response['statusCode'] == 401
    assert 'Unauthorized' in json.loads(response['body'])['message']

def test_handle_chat_missing_messages():
    request_data = {}
    user_id = 'test-user'
    
    response = handle_chat(request_data, user_id)
    assert response['statusCode'] == 400
    assert 'No messages provided' in json.loads(response['body'])['message']

def test_handle_chat_invalid_temperature():
    request_data = {
        'messages': [{'role': 'user', 'content': 'Hello'}],
        'parameters': {
            'temperature': 2.0
        }
    }
    user_id = 'test-user'
    
    response = handle_chat(request_data, user_id)
    assert response['statusCode'] == 400
    assert 'Temperature must be between 0 and 1' in json.loads(response['body'])['message']

def test_handle_document_analysis_missing_document_id():
    request_data = {}
    user_id = 'test-user'
    
    response = handle_document_analysis(request_data, user_id)
    assert response['statusCode'] == 400
    assert 'Document ID is required' in json.loads(response['body'])['message']

def test_handle_document_analysis_invalid_analysis_type():
    request_data = {
        'documentId': 'test-doc',
        'options': {
            'analysisType': 'invalid'
        }
    }
    user_id = 'test-user'
    
    response = handle_document_analysis(request_data, user_id)
    assert response['statusCode'] == 400
    assert 'Invalid analysis type' in json.loads(response['body'])['message']

def test_handle_knowledge_search_missing_query():
    request_data = {}
    user_id = 'test-user'
    
    response = handle_knowledge_search(request_data, user_id)
    assert response['statusCode'] == 400
    assert 'Search query is required' in json.loads(response['body'])['message'] 