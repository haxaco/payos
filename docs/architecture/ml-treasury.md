# ML-Powered Treasury Float Projections

**Date:** December 18, 2025  
**Epic:** 8 - AI Insights  
**Priority:** High - Treasury Risk Management  

---

## Executive Summary

Build ML-powered float projection system to predict currency balance depletion and recommend rebalancing actions. Uses historical transfer patterns, stream drain rates, and temporal features to forecast 48-96 hour liquidity needs.

---

## Current Data Available

**Historical Training Data:**
- ✅ **3,469 transfers** (last 11 days) - Payment patterns
- ✅ **35 streams** (35 days history) - Continuous outflows
- ✅ **127 ledger entries** (6 days) - Balance snapshots

**This is enough for:**
- Time-series forecasting models
- Pattern detection (day-of-week, hour-of-day)
- Anomaly detection
- Basic confidence intervals

---

## ML Architecture: Two-Tier Approach

### **Tier 1: Simple Rule-Based (MVP - Story 0.2)**
**For initial Epic 0 implementation**

```sql
-- Simple projection: current balance - scheduled transfers - stream drain
WITH currency_balance AS (
  SELECT 
    currency,
    SUM(balance_available) as current_balance
  FROM accounts WHERE tenant_id = $1
  GROUP BY currency
),
scheduled_outflows AS (
  SELECT 
    currency,
    SUM(amount) as scheduled_48h
  FROM transfers
  WHERE tenant_id = $1 
    AND status = 'pending'
    AND scheduled_for BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
  GROUP BY currency
),
stream_drain AS (
  SELECT 
    currency,
    SUM(flow_rate_per_second) * (48 * 60 * 60) as stream_drain_48h
  FROM streams
  WHERE tenant_id = $1 AND status = 'active'
  GROUP BY currency
)
SELECT 
  cb.currency,
  cb.current_balance,
  COALESCE(so.scheduled_48h, 0) as scheduled_outflows,
  COALESCE(sd.stream_drain_48h, 0) as stream_drain,
  cb.current_balance - COALESCE(so.scheduled_48h, 0) - COALESCE(sd.stream_drain_48h, 0) as projected_balance_48h
FROM currency_balance cb
LEFT JOIN scheduled_outflows so ON so.currency = cb.currency
LEFT JOIN stream_drain sd ON sd.currency = cb.currency;
```

**Pros:**
- ✅ Zero ML complexity
- ✅ Fast to implement (2 hours)
- ✅ Deterministic and explainable
- ✅ Good baseline

**Cons:**
- ❌ Ignores historical patterns
- ❌ Doesn't account for unscheduled transfers
- ❌ No confidence intervals
- ❌ Misses seasonality

---

### **Tier 2: ML-Powered Predictions (Epic 8 - Story 8.3)**
**For production-grade treasury management**

#### **Model Pipeline:**

```
Historical Data → Feature Engineering → ML Models → Ensemble → Projection + Confidence
```

---

## Feature Engineering

### **1. Temporal Features**

```sql
-- Extract time-based features from historical transfers
CREATE VIEW transfer_temporal_features AS
SELECT 
  id,
  tenant_id,
  amount,
  currency,
  created_at,
  
  -- Time features
  EXTRACT(HOUR FROM created_at) as hour_of_day,
  EXTRACT(DOW FROM created_at) as day_of_week,  -- 0=Sunday, 6=Saturday
  EXTRACT(DAY FROM created_at) as day_of_month,
  EXTRACT(ISODOW FROM created_at) as iso_day_of_week, -- 1=Monday, 7=Sunday
  
  -- Business hour flag
  CASE 
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 9 AND 17 
      AND EXTRACT(ISODOW FROM created_at) BETWEEN 1 AND 5 
    THEN true 
    ELSE false 
  END as is_business_hours,
  
  -- Month-end flag (last 3 days of month)
  CASE 
    WHEN EXTRACT(DAY FROM created_at) >= 
      EXTRACT(DAY FROM (DATE_TRUNC('month', created_at) + INTERVAL '1 month' - INTERVAL '3 days'))
    THEN true 
    ELSE false 
  END as is_month_end,
  
  -- Week classification
  CASE 
    WHEN EXTRACT(ISODOW FROM created_at) IN (1, 2) THEN 'week_start'
    WHEN EXTRACT(ISODOW FROM created_at) IN (3, 4) THEN 'mid_week'
    WHEN EXTRACT(ISODOW FROM created_at) IN (5, 6, 7) THEN 'weekend'
  END as week_period
  
FROM transfers
WHERE status = 'completed';
```

### **2. Velocity Features**

```sql
-- Calculate transaction velocity (rate of outflows)
CREATE VIEW transfer_velocity_features AS
SELECT 
  tenant_id,
  currency,
  DATE_TRUNC('hour', created_at) as hour_bucket,
  
  -- Hourly aggregates
  COUNT(*) as tx_count_per_hour,
  SUM(amount) as volume_per_hour,
  AVG(amount) as avg_tx_size,
  STDDEV(amount) as tx_size_stddev,
  
  -- Rolling metrics (lag window functions)
  AVG(SUM(amount)) OVER (
    PARTITION BY tenant_id, currency
    ORDER BY DATE_TRUNC('hour', created_at)
    ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
  ) as avg_volume_last_24h,
  
  AVG(COUNT(*)) OVER (
    PARTITION BY tenant_id, currency
    ORDER BY DATE_TRUNC('hour', created_at)
    ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
  ) as avg_tx_count_last_24h

FROM transfers
WHERE status = 'completed'
GROUP BY tenant_id, currency, DATE_TRUNC('hour', created_at);
```

### **3. Pattern Features**

```sql
-- Detect recurring patterns
CREATE VIEW transfer_pattern_features AS
SELECT 
  tenant_id,
  from_account_id,
  to_account_id,
  
  -- Recurrence detection
  COUNT(*) as total_transactions,
  AVG(amount) as avg_amount,
  STDDEV(amount) as amount_variance,
  
  -- Time between transactions (detect periodicity)
  AVG(
    EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (
      PARTITION BY tenant_id, from_account_id, to_account_id
      ORDER BY created_at
    )))
  ) / 3600 as avg_hours_between_tx,
  
  -- Regularity score (lower variance = more regular)
  STDDEV(
    EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (
      PARTITION BY tenant_id, from_account_id, to_account_id
      ORDER BY created_at
    )))
  ) / 3600 as hours_between_tx_stddev,
  
  -- Is this a recurring payment?
  CASE 
    WHEN COUNT(*) >= 3 
      AND STDDEV(amount) / NULLIF(AVG(amount), 0) < 0.1  -- Low variance in amount
      AND STDDEV(
        EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (
          PARTITION BY tenant_id, from_account_id, to_account_id
          ORDER BY created_at
        )))
      ) / 3600 < 24  -- Low variance in timing
    THEN true
    ELSE false
  END as is_recurring
  
FROM transfers
WHERE status = 'completed'
GROUP BY tenant_id, from_account_id, to_account_id
HAVING COUNT(*) >= 2;  -- Need at least 2 transactions to detect pattern
```

### **4. Stream Features**

```sql
-- Stream characteristics that affect projections
CREATE VIEW stream_projection_features AS
SELECT 
  id,
  tenant_id,
  currency,
  
  -- Basic flow
  flow_rate_per_second,
  flow_rate_per_month,
  
  -- Runway calculation
  funded_amount,
  total_streamed,
  funded_amount - total_streamed as remaining_funds,
  
  -- Time until depletion (hours)
  CASE 
    WHEN flow_rate_per_second > 0 
    THEN (funded_amount - total_streamed) / flow_rate_per_second / 3600
    ELSE NULL
  END as hours_until_depleted,
  
  -- Health indicators
  health,
  CASE 
    WHEN (funded_amount - total_streamed) / flow_rate_per_second < 86400 THEN 'critical'  -- < 24 hours
    WHEN (funded_amount - total_streamed) / flow_rate_per_second < 259200 THEN 'warning'  -- < 72 hours
    ELSE 'healthy'
  END as runway_status,
  
  -- Pause history (indicates instability)
  total_paused_seconds,
  last_pause_at,
  EXTRACT(EPOCH FROM (NOW() - COALESCE(last_pause_at, started_at))) as seconds_since_last_pause

FROM streams
WHERE status = 'active';
```

---

## ML Model Options

### **Option A: Time Series Forecasting (ARIMA/Prophet)**

**Model:** Facebook Prophet or ARIMA  
**Training Data:** Hourly balance snapshots  

```python
# Pseudocode
from prophet import Prophet

# 1. Create time series of hourly balances
df = pd.DataFrame({
    'ds': hourly_timestamps,  # datetime
    'y': balance_usdc,         # balance at that hour
})

# 2. Add regressors (external factors)
df['hour'] = df['ds'].dt.hour
df['day_of_week'] = df['ds'].dt.dayofweek
df['is_month_end'] = df['ds'].dt.is_month_end

model = Prophet(
    daily_seasonality=True,
    weekly_seasonality=True,
    yearly_seasonality=False,  # Not enough data yet
)

# Add regressors
model.add_regressor('hour')
model.add_regressor('day_of_week')
model.add_regressor('is_month_end')

# Fit
model.fit(df)

# Predict next 48 hours
future = model.make_future_dataframe(periods=48, freq='H')
forecast = model.predict(future)

# Get prediction + confidence interval
prediction = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
```

**Pros:**
- ✅ Handles seasonality automatically
- ✅ Built-in confidence intervals
- ✅ Works with limited data
- ✅ Interpretable (decomposition plots)

**Cons:**
- ❌ Requires regular time-series (need to create balance snapshots)
- ❌ Slower to retrain (Python service)
- ❌ Harder to deploy

---

### **Option B: Gradient Boosting (XGBoost/LightGBM)**

**Model:** LightGBM for tabular prediction  
**Training Data:** Historical outflows aggregated by time period  

```python
# Pseudocode
import lightgbm as lgb

# 1. Create training dataset
X_train = pd.DataFrame({
    'hour_of_day': [14, 15, 16, ...],
    'day_of_week': [1, 1, 1, ...],
    'is_business_hours': [1, 1, 1, ...],
    'avg_volume_last_24h': [12000, 11500, ...],
    'tx_count_last_hour': [5, 7, 3, ...],
    'stream_drain_rate': [100, 100, 100, ...],
    'is_month_end': [0, 0, 0, ...],
})

y_train = [1500, 1800, 1200, ...]  # Actual outflows in next hour

# 2. Train model
model = lgb.LGBMRegressor(
    objective='regression',
    num_leaves=31,
    learning_rate=0.05,
    n_estimators=100,
)

model.fit(X_train, y_train)

# 3. Predict next 48 hours
predictions = []
for hour in range(48):
    X_future = create_features_for_future_hour(hour)
    predicted_outflow = model.predict(X_future)
    predictions.append(predicted_outflow)

# 4. Calculate projected balance
projected_balance = current_balance - sum(predictions)

# 5. Confidence intervals (via quantile regression)
model_lower = lgb.LGBMRegressor(objective='quantile', alpha=0.1)
model_upper = lgb.LGBMRegressor(objective='quantile', alpha=0.9)
# ... fit and predict for confidence bounds
```

**Pros:**
- ✅ Handles irregular data well
- ✅ Fast inference
- ✅ Feature importance (explainability)
- ✅ Can train on raw transactions (no need for time-series)

**Cons:**
- ❌ Requires more feature engineering
- ❌ Confidence intervals need quantile regression (extra complexity)
- ❌ Less interpretable than Prophet

---

### **Option C: PostgreSQL ML Extension (PL/Python)**

**Model:** Train directly in Postgres using PL/Python + scikit-learn  

```sql
-- Install PL/Python extension
CREATE EXTENSION IF NOT EXISTS plpython3u;

-- Create ML function in database
CREATE OR REPLACE FUNCTION predict_outflows_next_48h(
  p_tenant_id UUID,
  p_currency TEXT
)
RETURNS TABLE(
  hour_offset INTEGER,
  predicted_outflow NUMERIC,
  confidence_lower NUMERIC,
  confidence_upper NUMERIC
) AS $$
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
import pickle

# 1. Load trained model from database
model_query = plpy.execute(f"""
  SELECT model_data 
  FROM ml_models 
  WHERE model_name = 'treasury_projection' 
    AND currency = '{p_currency}'
""")
model = pickle.loads(model_query[0]['model_data'])

# 2. Get current features
features_query = plpy.execute(f"""
  SELECT * FROM transfer_velocity_features
  WHERE tenant_id = '{p_tenant_id}'
    AND currency = '{p_currency}'
  ORDER BY hour_bucket DESC
  LIMIT 1
""")

# 3. Predict next 48 hours
results = []
for hour in range(48):
    X = create_feature_vector(features_query[0], hour)
    pred = model.predict([X])[0]
    results.append((hour, pred, pred * 0.8, pred * 1.2))  # Simple confidence

return results
$$ LANGUAGE plpython3u;
```

**Pros:**
- ✅ No external service needed
- ✅ Models stored in database (versioned)
- ✅ Fast - runs directly in Postgres
- ✅ Easy to integrate with existing queries

**Cons:**
- ❌ Requires `plpython3u` extension (not all hosts support)
- ❌ Limited ML libraries (no PyTorch/TensorFlow)
- ❌ Harder to debug
- ❌ Security concerns (untrusted code)

---

## **Recommended Approach: Hybrid**

### **Phase 1 (Epic 0 - Story 0.2): Simple Rule-Based**
```sql
-- Current balance - scheduled - stream drain
projected_balance = current - scheduled_48h - stream_drain_48h
```
**Time:** 2 hours  
**Accuracy:** ~70% (ignores patterns)

---

### **Phase 2 (Epic 8 - Story 8.3): Lightweight ML Service**

**Architecture:**
```
PostgreSQL → Feature Views → Python ML Service → Predictions → Cache → API
```

**Stack:**
- **Model:** LightGBM (fast, accurate, good with small data)
- **Features:** Pre-computed SQL views (temporal + velocity + pattern)
- **Service:** Simple Flask/FastAPI microservice
- **Training:** Weekly batch retraining on historical data
- **Inference:** Real-time predictions cached for 5 minutes

**Implementation:**

```python
# apps/ml-service/treasury_forecaster.py

import lightgbm as lgb
import pandas as pd
import psycopg2

class TreasuryForecaster:
    def __init__(self, db_connection):
        self.db = db_connection
        self.models = {}  # Cache models by currency
        
    def train_model(self, tenant_id: str, currency: str):
        """Train model on historical data."""
        
        # 1. Fetch training data (last 30 days of hourly features)
        query = """
        SELECT 
          hour_of_day,
          day_of_week,
          is_business_hours::int,
          is_month_end::int,
          avg_volume_last_24h,
          tx_count_per_hour,
          stream_drain_rate,
          actual_outflow  -- Target variable
        FROM treasury_ml_training_data
        WHERE tenant_id = %s AND currency = %s
        ORDER BY hour_bucket DESC
        LIMIT 720;  -- 30 days * 24 hours
        """
        
        df = pd.read_sql(query, self.db, params=[tenant_id, currency])
        
        # 2. Split features and target
        X = df.drop(columns=['actual_outflow'])
        y = df['actual_outflow']
        
        # 3. Train model
        model = lgb.LGBMRegressor(
            objective='regression',
            num_leaves=15,      # Small tree (prevent overfitting)
            learning_rate=0.1,
            n_estimators=50,    # Few trees (fast inference)
            max_depth=5,
        )
        
        model.fit(X, y)
        
        # 4. Cache model
        self.models[f"{tenant_id}_{currency}"] = model
        
        return model
    
    def predict_next_48h(self, tenant_id: str, currency: str):
        """Predict outflows for next 48 hours."""
        
        # 1. Load or train model
        model_key = f"{tenant_id}_{currency}"
        if model_key not in self.models:
            self.train_model(tenant_id, currency)
        
        model = self.models[model_key]
        
        # 2. Get current features
        query = """
        SELECT * FROM treasury_current_features
        WHERE tenant_id = %s AND currency = %s
        """
        current_features = pd.read_sql(query, self.db, params=[tenant_id, currency])
        
        # 3. Predict next 48 hours
        predictions = []
        for hour_offset in range(48):
            # Create feature vector for future hour
            future_hour = (current_features['hour_of_day'][0] + hour_offset) % 24
            future_dow = (current_features['day_of_week'][0] + hour_offset // 24) % 7
            
            X_future = current_features.copy()
            X_future['hour_of_day'] = future_hour
            X_future['day_of_week'] = future_dow
            # ... update other time-dependent features
            
            pred = model.predict(X_future)[0]
            predictions.append({
                'hour_offset': hour_offset,
                'predicted_outflow': float(pred),
            })
        
        # 4. Calculate projected balance
        current_balance = self._get_current_balance(tenant_id, currency)
        cumulative_outflow = sum(p['predicted_outflow'] for p in predictions)
        projected_balance = current_balance - cumulative_outflow
        
        # 5. Add confidence intervals (via quantile models)
        # ... (train separate models for p10 and p90)
        
        return {
            'current_balance': current_balance,
            'projected_balance_48h': projected_balance,
            'hourly_predictions': predictions,
            'confidence_interval': {
                'lower': projected_balance * 0.85,  # Placeholder
                'upper': projected_balance * 1.15,
            },
            'depletion_risk': 'high' if projected_balance < 100000 else 'low',
        }
```

**API Integration:**

```typescript
// apps/api/src/routes/reports.ts

router.get('/treasury/projection', async (c) => {
  const ctx = c.get('ctx');
  const { currency } = c.req.query();
  
  // Call ML service
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:5000';
  const response = await fetch(
    `${mlServiceUrl}/predict/treasury?tenant_id=${ctx.tenantId}&currency=${currency}`
  );
  
  const prediction = await response.json();
  
  return c.json({ data: prediction });
});
```

---

## Database Schema Additions

### **1. Training Data View**

```sql
-- Create materialized view for ML training (refreshed hourly)
CREATE MATERIALIZED VIEW treasury_ml_training_data AS
WITH hourly_outflows AS (
  SELECT 
    tenant_id,
    currency,
    DATE_TRUNC('hour', created_at) as hour_bucket,
    SUM(amount) as actual_outflow,
    COUNT(*) as tx_count
  FROM transfers
  WHERE status = 'completed'
    AND from_account_id IN (SELECT id FROM accounts WHERE tenant_id = transfers.tenant_id)
  GROUP BY tenant_id, currency, DATE_TRUNC('hour', created_at)
),
features AS (
  SELECT 
    hour_bucket,
    tenant_id,
    currency,
    EXTRACT(HOUR FROM hour_bucket)::int as hour_of_day,
    EXTRACT(ISODOW FROM hour_bucket)::int as day_of_week,
    CASE 
      WHEN EXTRACT(HOUR FROM hour_bucket) BETWEEN 9 AND 17 
        AND EXTRACT(ISODOW FROM hour_bucket) <= 5 
      THEN true 
      ELSE false 
    END as is_business_hours,
    CASE 
      WHEN EXTRACT(DAY FROM hour_bucket) >= 28 
      THEN true 
      ELSE false 
    END as is_month_end,
    
    -- Rolling averages (lag features)
    AVG(actual_outflow) OVER (
      PARTITION BY tenant_id, currency
      ORDER BY hour_bucket
      ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
    ) as avg_outflow_last_24h,
    
    AVG(tx_count) OVER (
      PARTITION BY tenant_id, currency
      ORDER BY hour_bucket
      ROWS BETWEEN 24 PRECEDING AND 1 PRECEDING
    ) as avg_tx_count_last_24h
    
  FROM hourly_outflows
)
SELECT 
  f.*,
  ho.actual_outflow,
  
  -- Stream drain at that hour
  COALESCE((
    SELECT SUM(flow_rate_per_second) * 3600
    FROM streams s
    WHERE s.tenant_id = f.tenant_id
      AND s.currency = f.currency
      AND s.status = 'active'
      AND s.started_at <= f.hour_bucket
      AND (s.cancelled_at IS NULL OR s.cancelled_at > f.hour_bucket)
  ), 0) as stream_drain_rate
  
FROM features f
JOIN hourly_outflows ho 
  ON ho.tenant_id = f.tenant_id 
  AND ho.currency = f.currency
  AND ho.hour_bucket = f.hour_bucket
WHERE f.hour_bucket >= NOW() - INTERVAL '30 days';

-- Refresh every hour
CREATE INDEX idx_ml_training_tenant_currency 
  ON treasury_ml_training_data(tenant_id, currency, hour_bucket DESC);
```

### **2. Model Storage Table**

```sql
-- Store trained models in database
CREATE TABLE ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  currency TEXT,
  
  -- Model metadata
  model_type TEXT,  -- 'lightgbm', 'prophet', etc.
  version INTEGER DEFAULT 1,
  
  -- Serialized model (pickle or ONNX)
  model_data BYTEA,
  
  -- Performance metrics
  training_samples INTEGER,
  mae NUMERIC,  -- Mean Absolute Error
  rmse NUMERIC,  -- Root Mean Squared Error
  r2_score NUMERIC,
  
  -- Timestamps
  trained_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  UNIQUE(model_name, tenant_id, currency, version)
);

CREATE INDEX idx_ml_models_lookup 
  ON ml_models(tenant_id, currency, model_name) 
  WHERE trained_at = (
    SELECT MAX(trained_at) 
    FROM ml_models m2 
    WHERE m2.model_name = ml_models.model_name 
      AND m2.tenant_id = ml_models.tenant_id 
      AND m2.currency = ml_models.currency
  );
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     PayOS Frontend                      │
│  TreasuryPage.tsx uses useTreasuryProjection() hook    │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP GET /v1/reports/treasury/projection
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Hono API Server                       │
│  - Validates tenant auth                                │
│  - Checks cache (Redis) for recent predictions         │
│  - If cache miss, calls ML Service                     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP POST /predict/treasury
                     │
┌────────────────────▼────────────────────────────────────┐
│              ML Service (Python/FastAPI)                │
│  - Loads model from cache or database                  │
│  - Fetches features from PostgreSQL views              │
│  - Runs inference (LightGBM)                           │
│  - Returns prediction + confidence                     │
└────────────────────┬────────────────────────────────────┘
                     │ SQL queries
                     │
┌────────────────────▼────────────────────────────────────┐
│                  PostgreSQL Database                    │
│  - treasury_ml_training_data (materialized view)       │
│  - ml_models table (serialized models)                 │
│  - Feature views (temporal, velocity, pattern)         │
└─────────────────────────────────────────────────────────┘
```

**Caching Strategy:**
- Predictions cached for **5 minutes** (Redis)
- Models cached in memory (reloaded every **7 days**)
- Training data refreshed **hourly** (materialized view)

---

## Rollout Plan

### **Phase 1: Epic 0 - Simple Baseline** ✅
**Timeline:** 2 hours  
**Accuracy:** ~70%  

```sql
projected = current - scheduled - stream_drain
```

### **Phase 2: Epic 8 Story 8.1 - Infrastructure** 
**Timeline:** 3 days  
**Tasks:**
- [ ] Create feature engineering views
- [ ] Create `ml_models` table
- [ ] Create `treasury_ml_training_data` materialized view
- [ ] Set up refresh schedule

### **Phase 3: Epic 8 Story 8.2 - ML Service**
**Timeline:** 5 days  
**Tasks:**
- [ ] Build Python ML microservice (FastAPI)
- [ ] Implement LightGBM training pipeline
- [ ] Train initial models on historical data
- [ ] Implement prediction API endpoints
- [ ] Add model versioning and storage
- [ ] Deploy to Railway/Render

### **Phase 4: Epic 8 Story 8.3 - API Integration**
**Timeline:** 2 days  
**Tasks:**
- [ ] Add ML service call to Hono API
- [ ] Implement caching (Redis)
- [ ] Add fallback to simple baseline if ML fails
- [ ] Create `/v1/reports/treasury/projection` endpoint

### **Phase 5: Epic 8 Story 8.4 - UI Integration**
**Timeline:** 2 days  
**Tasks:**
- [ ] Create `useTreasuryProjection()` hook
- [ ] Update TreasuryPage with projection chart
- [ ] Add confidence intervals visualization
- [ ] Add alerts for depletion risk

### **Phase 6: Epic 8 Story 8.5 - Monitoring & Retraining**
**Timeline:** 3 days  
**Tasks:**
- [ ] Track prediction accuracy vs actuals
- [ ] Alert on accuracy degradation
- [ ] Automated weekly retraining
- [ ] A/B test between models

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Prediction Accuracy (MAE)** | < $10K error | Compare `predicted_balance_48h` vs `actual_balance_48h` |
| **Depletion Detection** | 95% recall | Did we alert before running out? |
| **False Positive Rate** | < 10% | Alerted but didn't run out |
| **API Latency** | < 500ms | p95 response time |
| **Cache Hit Rate** | > 80% | Predictions served from cache |

---

## Alternative: Start with Prophet for Quick Win

**If you want simpler ML first:**

```python
from prophet import Prophet

# 1. Create hourly balance time series
df = get_hourly_balances(tenant_id, currency, days=30)

# 2. Train Prophet model
model = Prophet(
    daily_seasonality=True,
    weekly_seasonality=True,
)
model.fit(df)

# 3. Predict next 48 hours
future = model.make_future_dataframe(periods=48, freq='H')
forecast = model.predict(future)

# Extract prediction
projection = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
```

**Pros:**
- ✅ Easier to implement (no feature engineering)
- ✅ Built-in confidence intervals
- ✅ Beautiful decomposition plots

**Cons:**
- ❌ Requires creating balance snapshots (new data pipeline)
- ❌ Slower inference
- ❌ Less flexible

---

## My Recommendation

### **For Epic 0 (This Week):**
Simple rule-based projection. Fast, works, good baseline.

### **For Epic 8 (Later):**
LightGBM-based ML service with pre-computed feature views.

**Why:**
- ✅ LightGBM is fast, accurate, and works with small datasets
- ✅ Feature views are reusable for other ML models
- ✅ Microservice architecture allows easy model updates
- ✅ Can A/B test between simple baseline and ML

**We can discuss:**
- Deploy ML service where? (Railway, AWS Lambda, same server?)
- Training frequency? (Daily, weekly, on-demand?)
- Fallback strategy if ML service is down?
- Should we store predictions in DB or just cache?

---

**What do you think? Any questions on the ML approach?** 🤖


