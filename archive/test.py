from transformers import AutoTokenizer
from optimum.intel.openvino import OVModelForCausalLM

# Model ID from HuggingFace Hub
model_id = "OpenVINO/Mistral-7B-Instruct-v0.2-int4-ov" # ✅ You can switch this

# Load tokenizer and OpenVINO-optimized model
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = OVModelForCausalLM.from_pretrained(model_id)

# Encode prompt
inputs = tokenizer("What is OpenVINO?", return_tensors="pt")

# Generate output
outputs = model.generate(**inputs, max_length=200)

# Decode and print
text = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
print(text)
