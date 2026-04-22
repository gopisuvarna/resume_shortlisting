import json
import logging
import re
import os

# Prevent OpenMP memory allocation errors when combining PyTorch, FAISS, scikit-learn
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "1"

import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)

# ── Lazy model loading ────────────────────────────────────────────────────────
_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading sentence-transformers model (first run only)...")
            _embedder = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Model loaded.")
        except ImportError:
            logger.warning("sentence-transformers not installed. Embedding score will be 0.")
    return _embedder


PROMPT = """You are a senior technical recruiter performing a strict, evidence-based evaluation of a candidate against a job description.

You MUST follow these rules:

Grounding rule:
Only use information explicitly present in the resume or logically inferable. Do NOT assume missing skills or experience.
Skill inference rule:
Infer broader skills from specific mentions:
Algorithms/models → domain (e.g., XGBoost → Machine Learning)
Frameworks → domain (e.g., PyTorch → Deep Learning)
Tools → capability (e.g., FAISS → Vector Search)
Tech stacks → role (e.g., Django → Backend Development)
Evidence tagging (critical):
For every matched skill, ensure there is evidence from:
"explicit" (direct mention), OR
"inferred" (logically derived)

Do NOT include skills without evidence.

Required vs Optional skills:
Identify required skills from the job description.
Evaluate match percentage based ONLY on required skills.
Optional skills should influence score slightly but not dominate.
Experience normalization:
Internship = 0.5 weight
Project = 0.4 weight
Full-time = 1.0 weight
Strict scoring (avoid inflation):
Missing critical required skills → cap skills_match <= 75
Missing >50% required skills → cap <= 60
No domain experience → experience_match <= 50

SCORING:

skills_match (0-100):
Calculate:
(required_skills_matched / total_required_skills) x 100
Then adjust +/-5-10 for strong optional skills.

experience_match (0-100):
Evaluate based on:
domain relevance
level (student / junior / mid / senior)
type (project / internship / job)

education_match (0-100):
Compare degree and specialization strictly with job requirement.

OUTPUT RULES:

Return your response as a valid JSON object with exactly these keys:
"skills_match", "experience_match", "education_match", "summary", "explanation", "matched_skills", "missing_skills"

Example format:
{
  "skills_match": <number>,
  "experience_match": <number>,
  "education_match": <number>,
  "summary": "<max 3 sentences>",
  "explanation": "<1 paragraph with reasoning>",
  "matched_skills": [
    {"skill": "Machine Learning", "evidence": "inferred from XGBoost project"},
    {"skill": "Python", "evidence": "explicit"}
  ],
  "missing_skills": ["skill1", "skill2"]
}

Explanation requirements:
- Be precise and decision-oriented.
- State clearly whether the candidate should be shortlisted or not.
- If shortlisted, explain the strongest resume signals and why they outweigh gaps.
- If not shortlisted, explain the main blockers and which must-have skills or experience are missing.
- Mention matched and missing skills in plain language.
- Keep it to 1-2 short paragraphs, but make it specific to the resume and job.

JOB DESCRIPTION:
{jd}

RESUME:
{resume}


IMPORTANT:
- Return ONLY valid JSON
- Do NOT include explanations before or after JSON
- Do NOT use markdown (no ```json)
- Ensure the JSON is complete and parsable
- If unsure, still return valid JSON with best effort
"""


def _build_prompt(jd_text: str, resume_text: str) -> str:
    """Safely inject JD/resume without Python format parsing JSON braces in the prompt."""
    return (
        PROMPT
        .replace('{jd}', jd_text[:2500])
        .replace('{resume}', resume_text[:2500])
    )


def _canonical_skill(skill: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', (skill or '').lower())


def _resume_has_skill(resume_text: str, skill: str) -> bool:
    text = (resume_text or '').lower()
    raw = (skill or '').strip().lower()
    if not raw:
        return False

    aliases = {
        'react': [r'\breact(?:\.js|js)?\b'],
        'node.js': [r'\bnode(?:\.js|js)?\b'],
        'nodejs': [r'\bnode(?:\.js|js)?\b'],
        'postgresql': [r'\bpostgres(?:ql)?\b'],
        'mongo db': [r'\bmongodb\b', r'\bmongo\s*db\b'],
        'mongodb': [r'\bmongodb\b', r'\bmongo\s*db\b'],
    }

    patterns = aliases.get(raw)
    if not patterns:
        patterns = [r'\b' + re.escape(raw).replace(r'\ ', r'\s+') + r'\b']

    return any(re.search(pattern, text) is not None for pattern in patterns)


def _extract_matched_skill_names(matched_skills) -> set:
    names = set()
    for item in matched_skills or []:
        if isinstance(item, str):
            key = _canonical_skill(item)
            if key:
                names.add(key)
        elif isinstance(item, dict):
            key = _canonical_skill(str(item.get('skill', '')))
            if key:
                names.add(key)
    return names


def _reconcile_skills_with_resume(data: dict, resume_text: str) -> dict:
    """Move skills from missing -> matched when resume text explicitly contains them."""
    matched = data.get('matched_skills') or []
    missing = data.get('missing_skills') or []

    if not isinstance(matched, list) or not isinstance(missing, list):
        return data

    matched_names = _extract_matched_skill_names(matched)
    reconciled_missing = []

    for miss in missing:
        if not isinstance(miss, str):
            continue

        if _resume_has_skill(resume_text, miss):
            miss_key = _canonical_skill(miss)
            if miss_key not in matched_names:
                matched.append({
                    'skill': miss,
                    'evidence': 'explicit mention in resume text',
                })
                matched_names.add(miss_key)
        else:
            reconciled_missing.append(miss)

    data['matched_skills'] = matched
    data['missing_skills'] = reconciled_missing
    return data


def _extract_skill_labels(items) -> list:
    labels = []
    for item in items or []:
        if isinstance(item, str):
            label = item.strip()
        elif isinstance(item, dict):
            label = str(item.get('skill', '')).strip()
        else:
            label = ''

        if label:
            labels.append(label)
    return labels


def _join_top_skills(items, limit: int = 5) -> str:
    labels = _extract_skill_labels(items)[:limit]
    return ', '.join(labels)


def _compose_explanation_opening(recommendation: str) -> str:
    if recommendation in ('STRONG_YES', 'YES'):
        return 'The candidate can be shortlisted.'
    if recommendation == 'MAYBE':
        return 'The candidate is a borderline shortlist.'
    return 'The candidate should not be shortlisted at this stage.'


def _compose_explanation_reason(recommendation: str, top_matches: str, top_missing: str) -> str:
    if recommendation in ('STRONG_YES', 'YES'):
        reason = 'The resume shows strong alignment with the role through the strongest matched skills and relevant experience.'
        if top_matches:
            reason += f' Key strengths include {top_matches}.'
        if top_missing:
            reason += f' The remaining gaps are {top_missing}, but they do not outweigh the overall fit.'
        return reason

    if recommendation == 'MAYBE':
        reason = 'The resume has useful strengths, but the fit is incomplete for a confident shortlist.'
        if top_matches:
            reason += f' Strengths include {top_matches}.'
        if top_missing:
            reason += f' The main gaps are {top_missing}, which are still important for the role.'
        return reason

    reason = 'The resume does not yet satisfy enough must-have requirements for a confident hire decision.'
    if top_missing:
        reason += f' The biggest blockers are {top_missing}.'
    if top_matches:
        reason += f' The strongest positives are {top_matches}, but they are not sufficient to offset the missing requirements.'
    return reason


def _build_explanation(
    recommendation: str,
    data: dict,
) -> str:
    top_matches = _join_top_skills(data.get('matched_skills') or [])
    top_missing = _join_top_skills(data.get('missing_skills') or [])

    opener = _compose_explanation_opening(recommendation)
    reason = _compose_explanation_reason(recommendation, top_matches, top_missing)
    return f'{opener} {reason}'


def _clean_json(text: str) -> dict:
    text = text.strip()

    # Handle code fences
    if '```' in text:
        parts = text.split('```')
        for part in parts[1:]:
            part = part.strip()
            if part.startswith('json'):
                part = part[4:].strip()
            try:
                return json.loads(part)
            except json.JSONDecodeError:
                continue

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting a complete JSON object
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Model returned keys without opening brace — wrap it
    try:
        return json.loads('{' + text + '}')
    except json.JSONDecodeError as e:
        raise ValueError(f'Cannot parse LLM response as JSON: {e} | text: {text[:200]}')


def _get_nlp_score(jd_text: str, resume_text: str) -> float:
    """TF-IDF cosine similarity + BM25 combined."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        from rank_bm25 import BM25Okapi

        jd_tokens     = re.findall(r'\b[a-zA-Z]{2,}\b', jd_text.lower())
        resume_tokens = re.findall(r'\b[a-zA-Z]{2,}\b', resume_text.lower())

        if not jd_tokens or not resume_tokens:
            return 0.0

        # BM25
        bm25       = BM25Okapi([jd_tokens])
        bm25_score = bm25.get_scores(resume_tokens)[0]
        max_bm25   = bm25.get_scores(jd_tokens)[0]
        bm25_norm  = min(100.0, (bm25_score / max_bm25 * 100)) if max_bm25 > 0 else 0.0

        # TF-IDF cosine
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf      = vectorizer.fit_transform([jd_text, resume_text])
        cosine_sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        tfidf_norm = min(100.0, cosine_sim * 100)

        return round((bm25_norm * 0.5) + (tfidf_norm * 0.5), 1)
    except Exception as e:
        logger.error(f'NLP scoring failed: {e}')
        return 0.0


def _get_embedding_score(jd_text: str, resume_text: str) -> tuple:
    """Sentence-transformer embedding + FAISS cosine similarity."""
    try:
        import faiss

        embedder = get_embedder()
        if embedder is None:
            return 0.0, []

        jd_emb     = embedder.encode(jd_text[:8000])
        resume_emb = embedder.encode(resume_text[:8000])

        jd_vec     = np.array([jd_emb],     dtype='float32')
        resume_vec = np.array([resume_emb], dtype='float32')

        faiss.normalize_L2(jd_vec)
        faiss.normalize_L2(resume_vec)

        index = faiss.IndexFlatIP(jd_vec.shape[1])
        index.add(jd_vec)
        distances, _ = index.search(resume_vec, 1)

        cosine_sim = float(distances[0][0])
        score      = max(0.0, min(100.0, (cosine_sim + 1) / 2 * 100))
        emb_list   = [float(x) for x in resume_emb]
        return round(score, 1), emb_list
    except Exception as e:
        logger.error(f'Embedding scoring failed: {e}')
        return 0.0, []


def _call_groq(jd_text: str, resume_text: str) -> dict:
    """Try Groq first — raises on any failure so caller can fallback."""
    from groq import Groq

    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key:
        raise ValueError('No Groq API key configured.')

    client = Groq(api_key=api_key)
    r = client.chat.completions.create(
        model='llama-3.3-70b-versatile',
        messages=[{
            'role': 'user',
            'content': _build_prompt(jd_text, resume_text),
        }],
        temperature=0.0,
        max_tokens=2000,
        response_format={'type': 'json_object'},
    )

    finish_reason = r.choices[0].finish_reason
    raw_content   = r.choices[0].message.content
    logger.info(f'Groq finish_reason={finish_reason} | preview: {raw_content[:200]}')

    if finish_reason == 'length':
        raise ValueError('Groq response truncated — token limit hit.')

    return _clean_json(raw_content)


def _call_openrouter(jd_text: str, resume_text: str) -> dict:
    """OpenRouter fallback via OpenAI SDK."""
    from openai import OpenAI

    api_key = getattr(settings, 'OPENROUTER_API_KEY', '')
    model   = getattr(settings, 'OPENROUTER_MODEL', 'meta-llama/llama-3.3-70b-instruct:free')

    if not api_key:
        raise ValueError('No OpenRouter API key configured.')

    client = OpenAI(
        api_key=api_key,
        base_url='https://openrouter.ai/api/v1',
    )
    r = client.chat.completions.create(
        model=model,
        messages=[{
            'role': 'user',
            'content': _build_prompt(jd_text, resume_text),
        }],
        temperature=0.0,
        max_tokens=2000,
        response_format={'type': 'json_object'},
    )

    finish_reason = r.choices[0].finish_reason
    raw_content   = r.choices[0].message.content
    logger.info(f'OpenRouter finish_reason={finish_reason} | preview: {raw_content[:200]}')

    if finish_reason == 'length':
        raise ValueError('OpenRouter response truncated — token limit hit.')

    return _clean_json(raw_content)


def _get_llm_score(jd_text: str, resume_text: str) -> dict:
    """
    LLM evaluation with Groq primary and OpenRouter fallback.
    Returns default dict on total failure.
    """
    default = {
        'llm_score':           0.0,
        'ai_skills_score':     0.0,
        'ai_experience_score': 0.0,
        'ai_education_score':  0.0,
        'summary':             'LLM evaluation unavailable.',
        'explanation':         'AI provider could not be reached.',
        'matched_skills':      [],
        'missing_skills':      [],
    }

    data     = None
    provider = None

    # ── Try Groq first ────────────────────────────────────────────────────────
    try:
        data     = _call_groq(jd_text, resume_text)
        provider = 'Groq'
    except Exception as e:
        logger.warning(f'Groq failed ({e}) — falling back to OpenRouter.')

    # ── Fallback to OpenRouter ────────────────────────────────────────────────
    if data is None:
        try:
            data     = _call_openrouter(jd_text, resume_text)
            provider = 'OpenRouter'
        except Exception as e:
            logger.error(f'OpenRouter also failed: {e}')
            return default

    logger.info(f'LLM scored via {provider}.')

    try:
        data = _reconcile_skills_with_resume(data, resume_text)

        skills = max(0.0, min(100.0, float(data.get('skills_match',    0))))
        exp    = max(0.0, min(100.0, float(data.get('experience_match', 0))))
        edu    = max(0.0, min(100.0, float(data.get('education_match',  0))))

        llm_score = round((skills * 0.50) + (exp * 0.35) + (edu * 0.15), 1)
        return {
            'llm_score':           round(max(0.0, min(100.0, llm_score)), 1),
            'ai_skills_score':     round(skills, 1),
            'ai_experience_score': round(exp,    1),
            'ai_education_score':  round(edu,    1),
            'summary':             data.get('summary',        ''),
            'explanation':         data.get('explanation',    ''),
            'matched_skills':      data.get('matched_skills', []),
            'missing_skills':      data.get('missing_skills', []),
        }
    except Exception as e:
        logger.error(f'LLM score parsing failed: {e} | data: {str(data)[:300]}')
        return default


def _safe_num(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _compute_final_score(
    nlp_score: float,
    embedding_score: float,
    llm_result: dict,
) -> float:
    """Skill-first scoring model with strict coverage and experience gates."""
    skills = max(0.0, min(100.0, _safe_num(llm_result.get('ai_skills_score'), 0.0)))
    exp    = max(0.0, min(100.0, _safe_num(llm_result.get('ai_experience_score'), 0.0)))
    edu    = max(0.0, min(100.0, _safe_num(llm_result.get('ai_education_score'), 0.0)))

    matched = llm_result.get('matched_skills') or []
    missing = llm_result.get('missing_skills') or []
    total = len(matched) + len(missing)
    coverage = (len(matched) / total * 100.0) if total > 0 else skills

    # PRIMARY: skills dominate (LLM skill score + deterministic coverage).
    skill_signal = max(0.0, min(100.0, (skills * 0.60) + (coverage * 0.40)))

    # SECONDARY: semantic relevance.
    semantic = max(0.0, min(100.0, (embedding_score * 0.80) + (nlp_score * 0.20)))

    base = (
        (skill_signal * 0.65) +
        (semantic * 0.20) +
        (exp * 0.10) +
        (edu * 0.05)
    )

    final = base

    # HARD HIRING RULES.
    if coverage < 50:
        final *= 0.60

    if coverage < 30:
        final = min(final, 40.0)

    if exp < 30:
        final *= 0.85

    return round(max(0.0, min(100.0, final)), 1)


def _score_debug_snapshot(nlp_score: float, embedding_score: float, llm_result: dict) -> dict:
    skills = max(0.0, min(100.0, _safe_num(llm_result.get('ai_skills_score'), 0.0)))
    exp = max(0.0, min(100.0, _safe_num(llm_result.get('ai_experience_score'), 0.0)))
    edu = max(0.0, min(100.0, _safe_num(llm_result.get('ai_education_score'), 0.0)))
    semantic = max(0.0, min(100.0, (embedding_score * 0.80) + (nlp_score * 0.20)))
    matched = llm_result.get('matched_skills') or []
    missing = llm_result.get('missing_skills') or []
    req_total = len(matched) + len(missing)
    coverage = (len(matched) / req_total * 100.0) if req_total > 0 else skills
    skill_signal = max(0.0, min(100.0, (skills * 0.60) + (coverage * 0.40)))

    return {
        'skills': round(skills, 1),
        'experience': round(exp, 1),
        'education': round(edu, 1),
        'semantic': round(semantic, 1),
        'coverage': round(coverage, 1),
        'skill_signal': round(skill_signal, 1),
    }


def score_application(app) -> None:
    """
        Hybrid scoring pipeline:
            semantic + AI skill/experience/education signals + hiring gates → final_score

    Updates the Application in-place and saves all score fields.
    Never raises — failures are logged and partial scores are saved.
    """
    if not app.extracted_text:
        logger.warning(f'Application {app.id} has no extracted text — skipping score.')
        return

    jd_text     = app.job.get_full_jd()
    resume_text = app.extracted_text

    # Phase 1: NLP (30%)
    nlp_score = _get_nlp_score(jd_text, resume_text)

    # Phase 2: Embeddings (40%)
    embedding_score, embedding_vector = _get_embedding_score(jd_text, resume_text)

    # Phase 3: LLM (30%) — Groq with OpenRouter fallback
    llm_result = _get_llm_score(jd_text, resume_text)
    llm_score  = llm_result['llm_score']

    # Real-world final score with required-skill coverage gating.
    debug_snapshot = _score_debug_snapshot(nlp_score, embedding_score, llm_result)
    final_score = _compute_final_score(
        nlp_score=nlp_score,
        embedding_score=embedding_score,
        llm_result=llm_result,
    )

    # Recommendation from final score
    if final_score >= 80:
        rec = 'STRONG_YES'
    elif final_score >= 65:
        rec = 'YES'
    elif final_score >= 45:
        rec = 'MAYBE'
    else:
        rec = 'NO'

    # Write all fields
    app.nlp_score            = nlp_score
    app.embedding_score      = embedding_score
    app.llm_score            = llm_score
    app.final_score          = final_score
    app.embedding_vector     = embedding_vector
    app.ai_skills_score      = llm_result['ai_skills_score']
    app.ai_experience_score  = llm_result['ai_experience_score']
    app.ai_education_score   = llm_result['ai_education_score']
    app.ai_summary           = llm_result['summary']
    app.llm_explanation      = _build_explanation(rec, llm_result)
    app.ai_matched_skills    = llm_result['matched_skills']
    app.ai_missing_skills    = llm_result['missing_skills']
    app.ai_recommendation    = rec

    # Auto-shortlist if enabled and score meets threshold
    auto_enabled   = getattr(settings, 'AUTO_SHORTLIST_ENABLED', True)
    auto_threshold = float(getattr(settings, 'AUTO_SHORTLIST_THRESHOLD', 60))

    if auto_enabled and final_score >= auto_threshold and app.status in ('PENDING', 'REVIEWING'):
        app.status = 'SHORTLISTED'

    app.save()
    logger.info(
        f'Application {app.id} scored: {final_score}/100 '
        f'[Emb:{embedding_score} NLP:{nlp_score} LLM:{llm_score} '
        f"Skills:{debug_snapshot['skills']} Exp:{debug_snapshot['experience']} "
        f"Edu:{debug_snapshot['education']} Cov:{debug_snapshot['coverage']} "
        f"Sig:{debug_snapshot['skill_signal']}] → {rec}"
    )