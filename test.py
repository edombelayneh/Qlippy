from transformers import WhisperForConditionalGeneration, WhisperProcessor

model_id = "openai/whisper-base"
save_path = "./models/whisper-base"

# Download the model weights and config
model = WhisperForConditionalGeneration.from_pretrained(model_id)
model.save_pretrained(save_path)

# Download the processor (tokenizer + feature extractor)
processor = WhisperProcessor.from_pretrained(model_id)
processor.save_pretrained(save_path)
