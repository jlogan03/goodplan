# ML Pipeline Review Criteria

Domain-specific evaluation criteria for the ML pipeline reviewer. Evaluates machine learning pipeline design: data preprocessing, feature engineering, model training, evaluation, deployment, and reproducibility. Does NOT evaluate general algorithmic correctness (the algorithm reviewer handles that) or general plan structure (the holistic reviewer handles that).

## Codebase Exploration Focus

Before evaluating, use Grep, Glob, and Read tools to explore the codebase. Focus on:
- Data pipeline — ingestion, cleaning, transformation, feature extraction
- Train/test split — data partitioning strategy, stratification, temporal splits
- Feature engineering — feature definitions, feature stores, transformation pipelines
- Model training — hyperparameter configuration, training loops, checkpointing
- Evaluation — metrics, validation strategy, test set usage
- Experiment tracking — MLflow, W&B, DVC, experiment metadata
- Deployment — model serving, inference pipeline, model versioning
- Reproducibility — random seeds, environment pinning, data versioning

## Evaluation Criteria

1. **Data handling**: Is data processed correctly?
   - Train/test split prevents data leakage (temporal, group-based splits where appropriate)
   - Preprocessing fitted on training data only (not on test data)
   - Missing values handled explicitly (imputation strategy documented)
   - Data validation catches schema drift and distribution shift
   - Data versioning enables reproducing results from any point in time

2. **Feature engineering**: Are features well-designed?
   - Feature transformations are reproducible (fitted parameters saved)
   - Feature importance measured and low-value features pruned
   - Feature encoding appropriate for the model type
   - Feature store or registry for reuse across models
   - No target leakage through features

3. **Model training**: Is training robust?
   - Hyperparameter search methodology documented (grid, random, Bayesian)
   - Cross-validation strategy appropriate (k-fold, stratified, time-series)
   - Early stopping configured to prevent overfitting
   - Checkpointing enables resume from interruption
   - Training reproducible given same data and configuration

4. **Evaluation**: Is model evaluation rigorous?
   - Metrics appropriate for the problem (not just accuracy for imbalanced data)
   - Evaluation on held-out test set (not validation set used during tuning)
   - Confidence intervals or statistical significance reported
   - Baseline comparison (simple model, previous version, random)
   - Fairness and bias evaluation where applicable

5. **Deployment**: Is model serving production-ready?
   - Model versioning with rollback capability
   - Inference pipeline matches training preprocessing exactly
   - Latency and throughput requirements specified and tested
   - Model monitoring for prediction drift and performance degradation
   - A/B testing or shadow deployment for new models

6. **Reproducibility**: Can experiments be reproduced?
   - Random seeds set for all stochastic components
   - Environment pinned (Python version, library versions, CUDA version)
   - Data, code, and configuration versioned together
   - Experiment metadata logged (parameters, metrics, artifacts)
   - Results reproducible on different machines (within documented tolerance)

## Scoring Guidelines

- Score 9-10: No data leakage, rigorous evaluation, reproducible, production-ready serving
- Score 7-8: Good data handling, solid evaluation, minor reproducibility gaps
- Score 5-6: Some leakage risk, incomplete evaluation, limited reproducibility
- Score 3-4: Data leakage present, weak evaluation, not reproducible
- Score 1-2: Fundamental data leakage, no proper evaluation, no versioning
