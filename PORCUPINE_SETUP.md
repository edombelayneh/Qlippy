# Fixing Porcupine Activation Limit Error

You're encountering error code `00000136` which means your Porcupine access key has reached its activation limit. Here's how to fix it:

## Quick Fix

1. **Get a New Access Key**:
   - Visit: https://console.picovoice.ai/
   - Sign up for a free account (or log in)
   - Navigate to "Access Keys" section
   - Generate a new access key

2. **Update Your Configuration**:
   - Open the `.env` file in your project root
   - Replace `your_new_access_key_here` with your actual access key:
   ```
   PORCUPINE_ACCESS_KEY=your_actual_access_key_here
   ```

3. **Restart the Application**:
   ```bash
   npm run start:hotword
   ```

## Detailed Steps

### Step 1: Get Your Access Key

1. Go to https://console.picovoice.ai/
2. Click "Sign Up" or "Log In"
3. Once logged in, go to "Access Keys" in the sidebar
4. Click "Create Access Key"
5. Give it a name (e.g., "Qlippy Voice Assistant")
6. Copy the generated key

### Step 2: Configure Your Environment

**Option A: Using .env file (Recommended)**
```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your actual access key
nano .env

# Replace the placeholder with your actual access key
PORCUPINE_ACCESS_KEY=your_actual_access_key_here
```

**Option B: Using shell environment**
```bash
# Add to your shell profile
echo 'export PORCUPINE_ACCESS_KEY="your_actual_access_key_here"' >> ~/.zshrc
source ~/.zshrc
```

### Step 3: Test the Setup

1. Start the voice detection:
   ```bash
   npm run start:hotword
   ```

2. You should see:
   ```
   ✅ Voice detection initialized successfully
   Listening for "Hey Qlippy"...
   ```

## Troubleshooting

### If you still get the activation limit error:

1. **Check your access key**: Make sure you're using the correct key from Picovoice Console
2. **Verify the .env file**: Ensure the file exists and has the correct format
3. **Restart completely**: Close all terminals and restart your application
4. **Check for typos**: Make sure there are no extra spaces or characters in your access key

### If you get "access key not configured" error:

1. Make sure your `.env` file exists in the project root
2. Verify the access key is properly set
3. Restart the application

### If you get other errors:

1. **Audio device issues**: Check microphone permissions
2. **Network issues**: Ensure you have internet connection for initial setup
3. **File permissions**: Make sure the app can read the `.env` file

## Free Tier Limits

- **Free tier**: 100 activations per month
- **Upgrade**: Visit Picovoice Console for paid plans with higher limits
- **Reset**: Free tier resets monthly

## Alternative Solutions

If you continue having issues with the free tier:

1. **Upgrade to paid plan**: More activations and features
2. **Use different wake word**: Some wake words have different limits
3. **Implement local wake word**: Consider using a local wake word detection library

## Support

- **Picovoice Documentation**: https://picovoice.ai/docs/
- **Console Help**: https://console.picovoice.ai/
- **GitHub Issues**: Create an issue in your project repository

## Environment Variables Reference

```bash
# Required
PORCUPINE_ACCESS_KEY=your_access_key_here

# Optional (for debugging)
DEBUG=porcupine:*
```

## File Structure

Your project should have:
```
Qlippy/
├── .env.example           # Template file (tracked in git)
├── .env                   # Your access key here (ignored by git)
├── hotword.js             # Voice detection logic
├── Hey-Qlippy.ppn        # Wake word model
└── package.json           # Dependencies
```

## Next Steps

Once voice detection is working:

1. Test the wake word: Say "Hey Qlippy" clearly
2. Check the tray icon shows the correct status
3. Verify the main app opens when wake word is detected
4. Test the voice recording feature in the chat interface 