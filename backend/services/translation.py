from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_name = "ai4bharat/indictrans2-en-indic-1B"

# Load tokenizer and model, trusting the custom code in the repo
tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name, trust_remote_code=True)

def translate_en_to_ta(text: str) -> str:
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model.generate(**inputs)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)
