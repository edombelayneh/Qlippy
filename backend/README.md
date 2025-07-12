# Qlippy Backend

A Flask-based REST API backend for the Qlippy chat application. This backend provides local storage for conversations, messages, and plugins using SQLite.

## Features

- **User Management**: Create and manage users
- **Conversation Storage**: Save and retrieve chat conversations
- **Message History**: Store all messages with timestamps
- **Plugin System**: Manage user plugins and settings
- **Local SQLite Database**: All data stored locally on the computer
- **RESTful API**: Clean API endpoints for frontend integration

## Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server:**
   ```bash
   python run.py
   ```

The server will start on `http://localhost:5001`

## API Endpoints

### Health Check
- `GET /api/health` - Check if the server is running

### Users
- `POST /api/users` - Create a new user
- `GET /api/users/<user_id>` - Get user information

### Conversations
- `GET /api/users/<user_id>/conversations` - Get all conversations for a user
- `POST /api/users/<user_id>/conversations` - Create a new conversation
- `GET /api/conversations/<conversation_id>` - Get a specific conversation with messages
- `PUT /api/conversations/<conversation_id>` - Update conversation (title, folder)
- `DELETE /api/conversations/<conversation_id>` - Delete a conversation

### Messages
- `POST /api/conversations/<conversation_id>/messages` - Add a message to a conversation
- `PUT /api/messages/<message_id>` - Update a message
- `DELETE /api/messages/<message_id>` - Delete a message

### Plugins
- `GET /api/users/<user_id>/plugins` - Get all plugins for a user
- `POST /api/users/<user_id>/plugins` - Create a new plugin
- `PUT /api/plugins/<plugin_id>` - Update a plugin
- `DELETE /api/plugins/<plugin_id>` - Delete a plugin

## Database Schema

### Users
- `id` (UUID) - Primary key
- `username` (String) - Unique username
- `created_at` (DateTime) - Account creation timestamp

### Conversations
- `id` (UUID) - Primary key
- `title` (String) - Conversation title
- `user_id` (UUID) - Foreign key to users
- `folder` (String) - Optional folder categorization
- `last_updated` (DateTime) - Last activity timestamp
- `created_at` (DateTime) - Creation timestamp

### Messages
- `id` (UUID) - Primary key
- `conversation_id` (UUID) - Foreign key to conversations
- `role` (String) - 'user' or 'assistant'
- `content` (Text) - Message content
- `timestamp` (DateTime) - Message timestamp

### Plugins
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `name` (String) - Plugin name
- `description` (Text) - Plugin description
- `enabled` (Boolean) - Plugin enabled status
- `created_at` (DateTime) - Creation timestamp

## Configuration

The application uses environment-based configuration. You can modify `config.py` to change settings:

- Database URI
- CORS origins
- Secret keys
- File upload limits
- Logging settings

## Development

### Project Structure
```
backend/
├── app.py              # Main application factory
├── config.py           # Configuration settings
├── models.py           # Database models
├── routes.py           # API routes
├── run.py              # Server startup script
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

### Adding New Features

1. **Add new models** in `models.py`
2. **Create routes** in `routes.py`
3. **Update configuration** in `config.py` if needed
4. **Test endpoints** using curl or Postman

### Database Migrations

The database is automatically created when the app starts. For production, consider using Flask-Migrate for database migrations.

## Testing

You can test the API using curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Create a user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}'

# Get conversations for a user
curl http://localhost:5000/api/users/<user_id>/conversations
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `run.py` or kill the process using port 5000
2. **Database errors**: Delete `qlippy.db` and restart the server
3. **CORS errors**: Check the CORS origins in `config.py`

### Logs

The application logs to the console in development mode. Check the terminal output for error messages.

## Security Notes

- This is a local development setup
- For production, consider:
  - Using HTTPS
  - Implementing proper authentication
  - Adding rate limiting
  - Using environment variables for secrets 