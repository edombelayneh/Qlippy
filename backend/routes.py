from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, User, Conversation, Message, Plugin

api = Blueprint('api', __name__)

# User routes
@api.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 409
    
    user = User(username=username)
    db.session.add(user)
    db.session.commit()
    
    return jsonify(user.to_dict()), 201

@api.route('/users/<user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict())

# Conversation routes
@api.route('/users/<user_id>/conversations', methods=['GET'])
def get_conversations(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    conversations = []
    for conv in user.conversations:
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

@api.route('/users/<user_id>/conversations', methods=['POST'])
def create_conversation(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    title = data.get('title', 'New Conversation')
    folder = data.get('folder')
    
    conversation = Conversation(
        title=title,
        user_id=user_id,
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
    if 'title' in data:
        conversation.title = data['title']
    if 'folder' in data:
        conversation.folder = data['folder']
    
    conversation.last_updated = datetime.utcnow()
    db.session.commit()
    
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
@api.route('/users/<user_id>/plugins', methods=['GET'])
def get_plugins(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    plugins = Plugin.query.filter_by(user_id=user_id).all()
    return jsonify([plugin.to_dict() for plugin in plugins])

@api.route('/users/<user_id>/plugins', methods=['POST'])
def create_plugin(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    enabled = data.get('enabled', True)
    
    if not name:
        return jsonify({'error': 'Plugin name is required'}), 400
    
    plugin = Plugin(
        user_id=user_id,
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

# Health check
@api.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy', 
        'message': 'Qlippy backend is running',
        'timestamp': datetime.utcnow().isoformat()
    }) 