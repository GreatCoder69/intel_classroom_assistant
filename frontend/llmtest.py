"""
LLM Testing Module

This module tests the OpenVINO LLM model functionality.
Loads a conversational AI model and tests inference capabilities.
"""

from transformers import AutoTokenizer
from optimum.intel.openvino import OVModelForCausalLM

def test_llm_model():
    """
    Test the OpenVINO LLM model with a sample query.
    
    Loads the neural-chat model and tests inference with a predefined question.
    Outputs the model's response for verification.
    """
    model_id = "OpenVINO/neural-chat-7b-v3-3-int8-ov"
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = OVModelForCausalLM.from_pretrained(model_id)

    inputs = tokenizer("who is the best chelsea player ever?", return_tensors="pt")

    outputs = model.generate(**inputs, max_length=200)
    text = tokenizer.batch_decode(outputs)[0]
    print(text)

if __name__ == "__main__":
    test_llm_model()