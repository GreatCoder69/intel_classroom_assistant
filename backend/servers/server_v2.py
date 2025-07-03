from datasets import load_dataset, Dataset
from mathematics_dataset import generate_settings
from mathematics_dataset import generate_settings
from mathematics_dataset.modules import algebra, calculus
from mathematics_dataset import generate_settings

import json, random

def format_inst(prompt, response):
    return {"text": f"### Instruction:\n{prompt.strip()}\n\n### Response:\n{response.strip()}"}

all_data = []

# 1. BIG-Bench Hard (BBH)
bbh_tasks = [
    "logical_deduction_three_objects",
    "multistep_arithmetic_two",
    "reasoning_about_colored_objects",
    "date_understanding"
]

print("📥 Loading BBH tasks...")
for task in bbh_tasks:
    print(f"  • {task}")
    task_data = load_dataset("lukaemon/bbh", task, split="test")
    for q in task_data:
        all_data.append(format_inst(q["input"], q["target"]))

print(f"✅ BBH entries loaded: {len(all_data)}")

# 2. OpenAssistant (OASST1) – Filtered
print("📥 Loading OpenAssistant (OASST1)...")
oa = load_dataset("OpenAssistant/oasst1", split="train")
count = 0
for msg in oa:
    labels = msg.get("labels") or []
    if msg["role"] == "assistant" and any(x in labels for x in ["math", "physics", "cs", "education"]):
        all_data.append(format_inst(msg["text"], msg["text"]))
        count += 1
print(f"✅ OpenAssistant educational entries loaded: {count}")

# 3. DeepMind Mathematics Dataset
print("📥 Generating DeepMind math questions...")
settings = generate_settings.Settings()

topics = {
    "algebra__quadratic": algebra,
    "calculus__differentiate": calculus,
    "calculus__integrate": calculus,
    "arithmetic__add_or_sub": arithmetic,
}

for name, module in topics.items():
    print(f"  • {name}")
    gen = module.Module(seed=0).generator(settings)
    for _ in range(200):
        q = next(gen)
        all_data.append(format_inst(q.question, q.answer))


# 4. PubMedQA
print("📥 Loading PubMedQA...")
pm = load_dataset("pubmed_qa", split="train")
for ex in pm:
    if ex["long_answer"].strip():
        all_data.append(format_inst(ex["question"], ex["long_answer"]))

print(f"✅ PubMedQA entries loaded: {len(pm)}")

# Shuffle and save
print("🔀 Shuffling and saving dataset...")
random.shuffle(all_data)

with open("college_edu.jsonl", "w", encoding="utf-8") as f:
    for entry in all_data:
        json.dump(entry, f, ensure_ascii=False)
        f.write("\n")

print(f"\n✅ Finished! Total combined entries: {len(all_data)}")
print("📁 Saved as: college_edu.jsonl")
