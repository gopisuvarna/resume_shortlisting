import sys
import types
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from shortlist import hybrid_scorer


class HybridScorerHelpersTests(SimpleTestCase):
    def test_build_prompt_injects_and_truncates(self):
        jd = "J" * 3000
        resume = "R" * 3000

        prompt = hybrid_scorer._build_prompt(jd, resume)

        self.assertIn("JOB DESCRIPTION:", prompt)
        self.assertIn("RESUME:", prompt)
        self.assertIn("J" * 2500, prompt)
        self.assertIn("R" * 2500, prompt)
        self.assertNotIn("J" * 2600, prompt)
        self.assertNotIn("R" * 2600, prompt)

    def test_resume_has_skill_alias_and_generic_match(self):
        text = "Built APIs using ReactJS, Node.js and Mongo DB"

        self.assertTrue(hybrid_scorer._resume_has_skill(text, "react"))
        self.assertTrue(hybrid_scorer._resume_has_skill(text, "nodejs"))
        self.assertTrue(hybrid_scorer._resume_has_skill(text, "mongodb"))
        self.assertTrue(hybrid_scorer._resume_has_skill("Great at machine learning", "machine learning"))
        self.assertFalse(hybrid_scorer._resume_has_skill(text, ""))
        self.assertFalse(hybrid_scorer._resume_has_skill(text, "kubernetes"))

    def test_extract_and_reconcile_skills(self):
        data = {
            "matched_skills": ["Python", {"skill": "Django"}],
            "missing_skills": ["React", "Kubernetes"],
        }

        out = hybrid_scorer._reconcile_skills_with_resume(
            data,
            "Experience in React.js and backend systems",
        )

        matched_labels = [
            item if isinstance(item, str) else item.get("skill", "")
            for item in out["matched_skills"]
        ]
        self.assertIn("React", matched_labels)
        self.assertEqual(out["missing_skills"], ["Kubernetes"])

    def test_clean_json_handles_multiple_formats(self):
        direct = hybrid_scorer._clean_json('{"skills_match": 80}')
        fenced = hybrid_scorer._clean_json('```json\n{"skills_match": 70}\n```')
        wrapped = hybrid_scorer._clean_json('"skills_match": 60, "experience_match": 50')

        self.assertEqual(direct["skills_match"], 80)
        self.assertEqual(fenced["skills_match"], 70)
        self.assertEqual(wrapped["skills_match"], 60)

        with self.assertRaises(ValueError):
            hybrid_scorer._clean_json("not-json")

    def test_compute_final_score_applies_gates(self):
        base_result = {
            "ai_skills_score": 80,
            "ai_experience_score": 80,
            "ai_education_score": 80,
            "matched_skills": ["Python", "Django"],
            "missing_skills": ["React"],
        }

        good = hybrid_scorer._compute_final_score(70, 75, base_result)
        low_coverage = hybrid_scorer._compute_final_score(
            70,
            75,
            {
                **base_result,
                "matched_skills": ["Python"],
                "missing_skills": ["Django", "React", "SQL", "AWS"],
            },
        )
        low_exp = hybrid_scorer._compute_final_score(
            70,
            75,
            {**base_result, "ai_experience_score": 10},
        )

        self.assertGreater(good, low_coverage)
        self.assertGreater(good, low_exp)


class HybridScorerProviderTests(SimpleTestCase):
    def test_get_llm_score_uses_groq_and_normalizes(self):
        with patch.object(
            hybrid_scorer,
            "_call_groq",
            return_value={
                "skills_match": 90,
                "experience_match": 70,
                "education_match": 60,
                "summary": "Strong candidate",
                "explanation": "Looks good",
                "matched_skills": ["Python"],
                "missing_skills": ["React"],
            },
        ):
            out = hybrid_scorer._get_llm_score("JD", "Resume has React and Python")

        self.assertEqual(out["ai_skills_score"], 90.0)
        self.assertEqual(out["ai_experience_score"], 70.0)
        self.assertEqual(out["ai_education_score"], 60.0)
        self.assertEqual(out["llm_score"], 78.5)
        self.assertIn("summary", out)

    def test_get_llm_score_falls_back_and_defaults_on_failures(self):
        with patch.object(hybrid_scorer, "_call_groq", side_effect=RuntimeError("boom")), patch.object(
            hybrid_scorer,
            "_call_openrouter",
            return_value={
                "skills_match": 55,
                "experience_match": 45,
                "education_match": 35,
                "summary": "Fallback",
                "explanation": "Fallback provider",
                "matched_skills": [],
                "missing_skills": [],
            },
        ):
            out = hybrid_scorer._get_llm_score("JD", "Resume")

        self.assertEqual(out["llm_score"], 48.5)

        with patch.object(hybrid_scorer, "_call_groq", side_effect=RuntimeError("boom")), patch.object(
            hybrid_scorer,
            "_call_openrouter",
            side_effect=RuntimeError("still boom"),
        ):
            failed = hybrid_scorer._get_llm_score("JD", "Resume")

        self.assertEqual(failed["llm_score"], 0.0)
        self.assertEqual(failed["matched_skills"], [])

    def test_get_llm_score_defaults_when_payload_shape_is_invalid(self):
        with patch.object(hybrid_scorer, "_call_groq", return_value=[]):
            out = hybrid_scorer._get_llm_score("JD", "Resume")

        self.assertEqual(out["llm_score"], 0.0)
        self.assertEqual(out["summary"], "LLM evaluation unavailable.")


class HybridScorerEngineTests(SimpleTestCase):
    def test_get_embedder_caches_model_and_handles_import_error(self):
        hybrid_scorer._embedder = None

        fake_sentence_transformers = types.ModuleType("sentence_transformers")
        constructor = MagicMock(return_value={"model": "ok"})
        fake_sentence_transformers.SentenceTransformer = constructor

        with patch.dict(sys.modules, {"sentence_transformers": fake_sentence_transformers}):
            first = hybrid_scorer.get_embedder()
            second = hybrid_scorer.get_embedder()

        self.assertEqual(first, {"model": "ok"})
        self.assertIs(first, second)
        constructor.assert_called_once_with("all-MiniLM-L6-v2")

        hybrid_scorer._embedder = None
        with patch.dict(sys.modules, {"sentence_transformers": None}):
            self.assertIsNone(hybrid_scorer.get_embedder())

    def test_get_nlp_score_success_and_failure_paths(self):
        fake_sklearn = types.ModuleType("sklearn")
        fake_feature_extraction = types.ModuleType("sklearn.feature_extraction")
        fake_text = types.ModuleType("sklearn.feature_extraction.text")
        fake_metrics = types.ModuleType("sklearn.metrics")
        fake_pairwise = types.ModuleType("sklearn.metrics.pairwise")
        fake_rank_bm25 = types.ModuleType("rank_bm25")

        class FakeVectorizer:
            def __init__(self, stop_words=None):
                self.stop_words = stop_words

            def fit_transform(self, docs):
                return [[1.0], [1.0]]

        class FakeBM25:
            def __init__(self, corpus):
                self.corpus = corpus

            def get_scores(self, tokens):
                return [4.0] if tokens == self.corpus[0] else [2.0]

        def fake_cosine_similarity(_a, _b):
            return [[0.8]]

        fake_text.TfidfVectorizer = FakeVectorizer
        fake_pairwise.cosine_similarity = fake_cosine_similarity
        fake_rank_bm25.BM25Okapi = FakeBM25

        with patch.dict(
            sys.modules,
            {
                "sklearn": fake_sklearn,
                "sklearn.feature_extraction": fake_feature_extraction,
                "sklearn.feature_extraction.text": fake_text,
                "sklearn.metrics": fake_metrics,
                "sklearn.metrics.pairwise": fake_pairwise,
                "rank_bm25": fake_rank_bm25,
            },
        ):
            score = hybrid_scorer._get_nlp_score("Python Django", "Python backend")

        self.assertEqual(score, 65.0)

        with patch.dict(sys.modules, {"rank_bm25": None}):
            failed_score = hybrid_scorer._get_nlp_score("Python Django", "Python backend")
        self.assertEqual(failed_score, 0.0)

    def test_get_embedding_score_success_and_fallbacks(self):
        fake_faiss = types.ModuleType("faiss")

        class FakeIndex:
            def __init__(self, dim):
                self.dim = dim
                self.items = []

            def add(self, vec):
                self.items.append(vec)

            def search(self, vec, k):
                return ([[0.5]], [[0]])

        fake_faiss.normalize_L2 = lambda _vec: None
        fake_faiss.IndexFlatIP = FakeIndex

        class FakeEmbedder:
            def encode(self, text):
                return [1.0, 0.0] if "Python" in text else [0.0, 1.0]

        with patch.dict(sys.modules, {"faiss": fake_faiss}), patch.object(
            hybrid_scorer,
            "get_embedder",
            return_value=FakeEmbedder(),
        ):
            score, vec = hybrid_scorer._get_embedding_score("Python JD", "Resume text")

        self.assertEqual(score, 75.0)
        self.assertEqual(vec, [0.0, 1.0])

        with patch.dict(sys.modules, {"faiss": fake_faiss}), patch.object(
            hybrid_scorer,
            "get_embedder",
            return_value=None,
        ):
            empty_score, empty_vec = hybrid_scorer._get_embedding_score("JD", "Resume")

        self.assertEqual(empty_score, 0.0)
        self.assertEqual(empty_vec, [])

        class BrokenEmbedder:
            def encode(self, _text):
                raise RuntimeError("bad embedding")

        with patch.dict(sys.modules, {"faiss": fake_faiss}), patch.object(
            hybrid_scorer,
            "get_embedder",
            return_value=BrokenEmbedder(),
        ):
            failed_score, failed_vec = hybrid_scorer._get_embedding_score("JD", "Resume")

        self.assertEqual(failed_score, 0.0)
        self.assertEqual(failed_vec, [])

    @override_settings(GROQ_API_KEY="")
    def test_call_groq_requires_key(self):
        fake_groq_module = types.ModuleType("groq")
        fake_groq_module.Groq = MagicMock()

        with patch.dict(sys.modules, {"groq": fake_groq_module}):
            with self.assertRaises(ValueError):
                hybrid_scorer._call_groq("JD", "Resume")

    @override_settings(GROQ_API_KEY="token")
    def test_call_groq_success_and_length_failure(self):
        fake_groq_module = types.ModuleType("groq")

        success_response = SimpleNamespace(
            choices=[SimpleNamespace(finish_reason="stop", message=SimpleNamespace(content='{"ok": true}'))]
        )
        length_response = SimpleNamespace(
            choices=[SimpleNamespace(finish_reason="length", message=SimpleNamespace(content='{"ok": true}'))]
        )

        groq_client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(create=MagicMock(side_effect=[success_response, length_response]))
            )
        )
        fake_groq_module.Groq = MagicMock(return_value=groq_client)

        with patch.dict(sys.modules, {"groq": fake_groq_module}), patch.object(
            hybrid_scorer,
            "_clean_json",
            return_value={"ok": True},
        ):
            out = hybrid_scorer._call_groq("JD", "Resume")
            self.assertEqual(out, {"ok": True})
            with self.assertRaises(ValueError):
                hybrid_scorer._call_groq("JD", "Resume")

    @override_settings(OPENROUTER_API_KEY="", OPENROUTER_MODEL="model-a")
    def test_call_openrouter_requires_key(self):
        fake_openai_module = types.ModuleType("openai")
        fake_openai_module.OpenAI = MagicMock()

        with patch.dict(sys.modules, {"openai": fake_openai_module}):
            with self.assertRaises(ValueError):
                hybrid_scorer._call_openrouter("JD", "Resume")

    @override_settings(OPENROUTER_API_KEY="token", OPENROUTER_MODEL="model-a")
    def test_call_openrouter_success_and_length_failure(self):
        fake_openai_module = types.ModuleType("openai")

        success_response = SimpleNamespace(
            choices=[SimpleNamespace(finish_reason="stop", message=SimpleNamespace(content='{"ok": true}'))]
        )
        length_response = SimpleNamespace(
            choices=[SimpleNamespace(finish_reason="length", message=SimpleNamespace(content='{"ok": true}'))]
        )

        openai_client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(create=MagicMock(side_effect=[success_response, length_response]))
            )
        )
        fake_openai_module.OpenAI = MagicMock(return_value=openai_client)

        with patch.dict(sys.modules, {"openai": fake_openai_module}), patch.object(
            hybrid_scorer,
            "_clean_json",
            return_value={"ok": True},
        ):
            out = hybrid_scorer._call_openrouter("JD", "Resume")
            self.assertEqual(out, {"ok": True})
            with self.assertRaises(ValueError):
                hybrid_scorer._call_openrouter("JD", "Resume")


class HybridScorerPipelineTests(SimpleTestCase):
    def _build_app(self, extracted_text="Candidate resume text", status="PENDING"):
        app = SimpleNamespace()
        app.id = 101
        app.job = SimpleNamespace(get_full_jd=lambda: "Python, Django")
        app.extracted_text = extracted_text
        app.status = status
        app.save = MagicMock()
        return app

    def test_score_application_skips_when_no_extracted_text(self):
        app = self._build_app(extracted_text="")

        hybrid_scorer.score_application(app)

        app.save.assert_not_called()

    @override_settings(AUTO_SHORTLIST_ENABLED=True, AUTO_SHORTLIST_THRESHOLD=60)
    def test_score_application_writes_scores_and_shortlists(self):
        app = self._build_app(extracted_text="Strong candidate resume", status="PENDING")

        with patch.object(hybrid_scorer, "_get_nlp_score", return_value=72.0), patch.object(
            hybrid_scorer,
            "_get_embedding_score",
            return_value=(80.0, [0.1, 0.2]),
        ), patch.object(
            hybrid_scorer,
            "_get_llm_score",
            return_value={
                "llm_score": 88.0,
                "ai_skills_score": 90.0,
                "ai_experience_score": 80.0,
                "ai_education_score": 70.0,
                "summary": "Great fit",
                "explanation": "Strong match",
                "matched_skills": ["Python", "Django"],
                "missing_skills": ["React"],
            },
        ):
            hybrid_scorer.score_application(app)

        self.assertGreaterEqual(app.final_score, 60.0)
        self.assertEqual(app.status, "SHORTLISTED")
        self.assertEqual(app.ai_recommendation, "YES")
        self.assertEqual(app.embedding_vector, [0.1, 0.2])
        app.save.assert_called_once()

    @override_settings(AUTO_SHORTLIST_ENABLED=False, AUTO_SHORTLIST_THRESHOLD=60)
    def test_score_application_no_auto_shortlist_and_recommendation_no(self):
        app = self._build_app(extracted_text="Weak candidate", status="REVIEWING")

        with patch.object(hybrid_scorer, "_get_nlp_score", return_value=10.0), patch.object(
            hybrid_scorer,
            "_get_embedding_score",
            return_value=(10.0, []),
        ), patch.object(
            hybrid_scorer,
            "_get_llm_score",
            return_value={
                "llm_score": 10.0,
                "ai_skills_score": 10.0,
                "ai_experience_score": 10.0,
                "ai_education_score": 10.0,
                "summary": "Not a fit",
                "explanation": "Major gaps",
                "matched_skills": ["Python"],
                "missing_skills": ["Django", "React", "SQL", "AWS"],
            },
        ):
            hybrid_scorer.score_application(app)

        self.assertEqual(app.status, "REVIEWING")
        self.assertEqual(app.ai_recommendation, "NO")
        app.save.assert_called_once()

    @override_settings(AUTO_SHORTLIST_ENABLED=True, AUTO_SHORTLIST_THRESHOLD=60)
    def test_score_application_recommendation_strong_yes(self):
        app = self._build_app(extracted_text="Excellent candidate", status="PENDING")

        with patch.object(hybrid_scorer, "_get_nlp_score", return_value=80.0), patch.object(
            hybrid_scorer,
            "_get_embedding_score",
            return_value=(90.0, [0.3, 0.4]),
        ), patch.object(
            hybrid_scorer,
            "_get_llm_score",
            return_value={
                "llm_score": 92.0,
                "ai_skills_score": 95.0,
                "ai_experience_score": 90.0,
                "ai_education_score": 85.0,
                "summary": "Top fit",
                "explanation": "Highly relevant",
                "matched_skills": ["Python", "Django", "AWS"],
                "missing_skills": [],
            },
        ), patch.object(hybrid_scorer, "_compute_final_score", return_value=85.0):
            hybrid_scorer.score_application(app)

        self.assertEqual(app.ai_recommendation, "STRONG_YES")
        self.assertEqual(app.status, "SHORTLISTED")

    @override_settings(AUTO_SHORTLIST_ENABLED=False, AUTO_SHORTLIST_THRESHOLD=60)
    def test_score_application_recommendation_maybe(self):
        app = self._build_app(extracted_text="Borderline candidate", status="REVIEWING")

        with patch.object(hybrid_scorer, "_get_nlp_score", return_value=40.0), patch.object(
            hybrid_scorer,
            "_get_embedding_score",
            return_value=(45.0, [0.5, 0.6]),
        ), patch.object(
            hybrid_scorer,
            "_get_llm_score",
            return_value={
                "llm_score": 48.0,
                "ai_skills_score": 50.0,
                "ai_experience_score": 45.0,
                "ai_education_score": 40.0,
                "summary": "Borderline fit",
                "explanation": "Some strengths and gaps",
                "matched_skills": ["Python"],
                "missing_skills": ["Django", "SQL"],
            },
        ), patch.object(hybrid_scorer, "_compute_final_score", return_value=50.0):
            hybrid_scorer.score_application(app)

        self.assertEqual(app.ai_recommendation, "MAYBE")
        self.assertEqual(app.status, "REVIEWING")
