
import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Configure Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_questions(file_path, num_questions=5):
    """
    Generates quiz questions from a file using Groq (Llama 3).
    """
    print(f"--- Processando: {os.path.basename(file_path)} ---")
    
    content = ""
    if file_path.lower().endswith('.pdf'):
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    content += text + "\n"
        except Exception as e:
            print(f"Erro ao ler PDF localmente: {e}")
            return []
    else:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Erro ao ler arquivo: {e}")
            return []

    if not content or len(content.strip()) < 100:
        print(f"Aviso: Conteúdo insuficiente ou erro na extração em {file_path}")
        return []

    # Limit content to avoid context limits (Groq free tier has 6000 TPM for this model)
    content_snippet = content[:10000]

    prompt = f"""
    Analise o texto técnico abaixo (manual DPR 5K II) e crie {num_questions} perguntas de múltipla escolha EM PORTUGUÊS.
    Cada pergunta deve ser focada em detalhes técnicos críticos, limites operacionais, procedimentos de segurança ou especificações.
    
    O formato de saída DEVE ser um JSON puro (lista de objetos) com a seguinte estrutura:
    [
      {{
        "question": "Pergunta clara e não ambígua relacionada ao controle de poço ou operações DPR 5K II...",
        "options": ["A) Opção 1", "B) Opção 2", "C) Opção 3", "D) Opção 4"],
        "correctAnswer": 0,
        "explanation": "Explicação técnica detalhada justificando a resposta correta citando o manual."
      }}
    ]
    
    Não inclua markdown. Apenas a lista JSON.

    TEXTO DO MANUAL:
    {content_snippet}
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
        )
        
        text = chat_completion.choices[0].message.content
        text = text.replace('```json', '').replace('```', '').strip()
        
        # Quick fix for common LLM JSON variations
        if text.startswith('```'):
            text = text.split('```')[1].strip()
            if text.startswith('json'):
                text = text[4:].strip()

        data = json.loads(text)
        if isinstance(data, dict):
            for key in ['questions', 'quiz', 'items', 'pergunta']:
                if key in data:
                    return data[key]
        return data if isinstance(data, list) else []
        
    except Exception as e:
        print(f"Erro no Groq para {file_path}: {e}")
        return []

def main():
    pdf_dir = r"C:\Users\genis\.gemini\antigravity\scratch\quiz-app\data\pdfs"
    output_file = "questions.json"
    
    # Target exactly 54 questions
    target_total = 54
    all_new_questions = []
    
    pdf_files = [f for f in os.listdir(pdf_dir) if f.lower().endswith('.pdf')]
    if not pdf_files:
        print("Nenhum PDF encontrado.")
        return

    questions_per_file = max(3, int(target_total / len(pdf_files)) + 1)
    
    for manual_name in pdf_files:
        if len(all_new_questions) >= target_total:
            break
            
        full_path = os.path.join(pdf_dir, manual_name)
        remaining = target_total - len(all_new_questions)
        to_generate = min(questions_per_file, remaining)
        
        new_qs = generate_questions(full_path, num_questions=to_generate)
        if new_qs:
            print(f"OK: +{len(new_qs)} questões geradas.")
            all_new_questions.extend(new_qs)
        else:
            print(f"Falha ao gerar questões para {manual_name}")

    # Enforce exactly 54 if it went slightly over
    all_new_questions = all_new_questions[:int(target_total)]

    if all_new_questions:
        # Load existing questions
        if os.path.exists(output_file):
            with open(output_file, 'r', encoding='utf-8') as f:
                try:
                    existing_questions = json.load(f)
                except:
                    existing_questions = []
        else:
            existing_questions = []
            
        # Append new questions
        existing_questions.extend(all_new_questions)
        
        # Save back to file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(existing_questions, f, indent=2, ensure_ascii=False)
            
        print(f"\nCONCLUÍDO: Total de {len(all_new_questions)} novas perguntas adicionadas.")

if __name__ == "__main__":
    main()
