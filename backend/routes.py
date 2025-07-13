from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, Conversation, Message, Plugin

api = Blueprint('api', __name__)

# Conversation routes
@api.route('/conversations', methods=['GET'])
def get_conversations():
    conversations = []
    for conv in Conversation.query.all():
        # Get the last message for preview
        last_message = Message.query.filter_by(conversation_id=conv.id).order_by(Message.timestamp.desc()).first()
        
        conv_data = conv.to_dict()
        conv_data['last_message_preview'] = (
            last_message.content[:100] + '...' 
            if last_message and len(last_message.content) > 100 
            else (last_message.content if last_message else '')
        )
        conversations.append(conv_data)
    
    return jsonify(conversations)

@api.route('/conversations', methods=['POST'])
def create_conversation():
    data = request.get_json()
    title = data.get('title', 'New Conversation')
    folder = data.get('folder')
    
    conversation = Conversation(
        title=title,
        folder=folder
    )
    db.session.add(conversation)
    db.session.commit()
    
    return jsonify(conversation.to_dict()), 201

@api.route('/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    return jsonify(conversation.to_dict_with_messages())

@api.route('/conversations/<conversation_id>', methods=['PUT'])
def update_conversation(conversation_id):
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    data = request.get_json()
    print(f"Updating conversation {conversation_id} with data: {data}")
    
    if 'title' in data:
        conversation.title = data['title']
    if 'folder' in data:
        print(f"Setting folder to: {data['folder']} (type: {type(data['folder'])})")
        conversation.folder = data['folder']
    
    conversation.last_updated = datetime.utcnow()
    db.session.commit()
    
    print(f"Conversation updated. New folder value: {conversation.folder}")
    return jsonify(conversation.to_dict())

@api.route('/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    db.session.delete(conversation)
    db.session.commit()
    
    return jsonify({'message': 'Conversation deleted successfully'})

# Message routes
@api.route('/conversations/<conversation_id>/messages', methods=['POST'])
def add_message(conversation_id):
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404
    
    data = request.get_json()
    role = data.get('role')
    content = data.get('content')
    
    if not role or not content:
        return jsonify({'error': 'Role and content are required'}), 400
    
    if role not in ['user', 'assistant']:
        return jsonify({'error': 'Role must be "user" or "assistant"'}), 400
    
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content
    )
    
    db.session.add(message)
    conversation.last_updated = datetime.utcnow()
    db.session.commit()
    
    return jsonify(message.to_dict()), 201

@api.route('/messages/<message_id>', methods=['PUT'])
def update_message(message_id):
    message = Message.query.get(message_id)
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    data = request.get_json()
    if 'content' in data:
        message.content = data['content']
    
    db.session.commit()
    
    return jsonify(message.to_dict())

@api.route('/messages/<message_id>', methods=['DELETE'])
def delete_message(message_id):
    message = Message.query.get(message_id)
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    db.session.delete(message)
    db.session.commit()
    
    return jsonify({'message': 'Message deleted successfully'})

# Plugin routes
@api.route('/plugins', methods=['GET'])
def get_plugins():
    plugins = Plugin.query.all()
    return jsonify([plugin.to_dict() for plugin in plugins])

@api.route('/plugins', methods=['POST'])
def create_plugin():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    enabled = data.get('enabled', True)
    
    if not name:
        return jsonify({'error': 'Plugin name is required'}), 400
    
    plugin = Plugin(
        name=name,
        description=description,
        enabled=enabled
    )
    
    db.session.add(plugin)
    db.session.commit()
    
    return jsonify(plugin.to_dict()), 201

@api.route('/plugins/<plugin_id>', methods=['PUT'])
def update_plugin(plugin_id):
    plugin = Plugin.query.get(plugin_id)
    if not plugin:
        return jsonify({'error': 'Plugin not found'}), 404
    
    data = request.get_json()
    if 'name' in data:
        plugin.name = data['name']
    if 'description' in data:
        plugin.description = data['description']
    if 'enabled' in data:
        plugin.enabled = data['enabled']
    
    db.session.commit()
    
    return jsonify(plugin.to_dict())

@api.route('/plugins/<plugin_id>', methods=['DELETE'])
def delete_plugin(plugin_id):
    plugin = Plugin.query.get(plugin_id)
    if not plugin:
        return jsonify({'error': 'Plugin not found'}), 404
    
    db.session.delete(plugin)
    db.session.commit()
    
    return jsonify({'message': 'Plugin deleted successfully'})

# Search routes
@api.route('/search', methods=['GET'])
def search_conversations():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    # Search in conversations (title and messages)
    conversations = []
    
    # Search by conversation title
    title_matches = Conversation.query.filter(
        Conversation.title.ilike(f'%{query}%')
    ).all()
    
    # Search by message content
    message_matches = Message.query.filter(
        Message.content.ilike(f'%{query}%')
    ).all()
    
    # Get unique conversations from message matches
    conversation_ids = set()
    for message in message_matches:
        conversation_ids.add(message.conversation_id)
    
    content_matches = Conversation.query.filter(
        Conversation.id.in_(conversation_ids)
    ).all()
    
    # Combine and deduplicate results
    all_conversations = list(set(title_matches + content_matches))
    
    for conv in all_conversations:
        # Find matching messages for this conversation
        matching_messages = []
        for message in message_matches:
            if message.conversation_id == conv.id:
                # Create a preview of the matching content
                content = message.content
                query_lower = query.lower()
                content_lower = content.lower()
                
                # Find the position of the query in the content
                pos = content_lower.find(query_lower)
                if pos != -1:
                    # Create a preview around the match
                    start = max(0, pos - 50)
                    end = min(len(content), pos + len(query) + 50)
                    preview = content[start:end]
                    
                    if start > 0:
                        preview = '...' + preview
                    if end < len(content):
                        preview = preview + '...'
                    
                    matching_messages.append({
                        'id': message.id,
                        'role': message.role,
                        'content': message.content,
                        'timestamp': message.timestamp.isoformat(),
                        'preview': preview
                    })
        
        conv_data = conv.to_dict()
        conv_data['matching_messages'] = matching_messages
        conv_data['match_count'] = len(matching_messages)
        conversations.append(conv_data)
    
    # Sort by relevance (conversations with more matches first)
    conversations.sort(key=lambda x: x['match_count'], reverse=True)
    
    return jsonify({
        'query': query,
        'results': conversations,
        'total_results': len(conversations)
    })

# Health check
@api.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Qlippy API is running',
        'timestamp': datetime.utcnow().isoformat()
    }) 