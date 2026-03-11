use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SealInput {
    pub title: String,
    pub content: String,
    #[serde(default)]
    pub blocks: Value,
    #[serde(default)]
    pub settings: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveEventInput {
    pub document_id: String,
    pub event_type: String,
    pub source: String,
    #[serde(default)]
    pub payload: Value,
    pub created_at: i64,
    #[serde(default)]
    pub previous_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineageInput {
    pub document_id: String,
    pub block_id: String,
    pub block_hash: String,
    #[serde(default)]
    pub previous_block_hash: Option<String>,
    #[serde(default)]
    pub parent_anchor_hash: Option<String>,
    pub change_type: String,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub how: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureInput {
    pub signer_name: String,
    pub block_id: String,
    pub signature_data: String,
}

fn canonicalize_value(value: Value) -> Value {
    match value {
        Value::Array(values) => {
            Value::Array(values.into_iter().map(canonicalize_value).collect())
        }
        Value::Object(map) => {
            let mut entries: Vec<_> = map.into_iter().collect();
            entries.sort_by(|(left, _), (right, _)| left.cmp(right));

            let mut sorted = Map::new();
            for (key, value) in entries {
                sorted.insert(key, canonicalize_value(value));
            }

            Value::Object(sorted)
        }
        other => other,
    }
}

fn canonical_json_bytes(value: &Value) -> Vec<u8> {
    let canonical = canonicalize_value(value.clone());
    serde_json::to_vec(&canonical).expect("canonical JSON serialization should never fail")
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

pub fn compute_seal_hash(input: &SealInput) -> String {
    sha256_hex(&canonical_json_bytes(&json!({
        "title": input.title,
        "content": input.content,
        "blocks": input.blocks,
        "settings": input.settings,
    })))
}

pub fn compute_block_hash(block: &Value) -> String {
    sha256_hex(&canonical_json_bytes(block))
}

pub fn compute_live_event_hash(input: &LiveEventInput) -> String {
    sha256_hex(&canonical_json_bytes(&json!({
        "documentId": input.document_id,
        "eventType": input.event_type,
        "source": input.source,
        "payload": input.payload,
        "createdAt": input.created_at,
        "previousHash": input.previous_hash.clone().unwrap_or_else(|| "GENESIS".to_string()),
    })))
}

pub fn compute_lineage_hash(input: &LineageInput) -> String {
    sha256_hex(&canonical_json_bytes(&json!({
        "documentId": input.document_id,
        "blockId": input.block_id,
        "blockHash": input.block_hash,
        "previousBlockHash": input.previous_block_hash,
        "parentAnchorHash": input.parent_anchor_hash,
        "changeType": input.change_type,
        "reason": input.reason,
        "how": input.how,
        "createdAt": input.created_at,
    })))
}

pub fn compute_signature_hash(input: &SignatureInput) -> String {
    sha256_hex(&canonical_json_bytes(&json!({
        "signatureData": input.signature_data,
        "signerName": input.signer_name,
        "blockId": input.block_id,
    })))
}

#[cfg(feature = "wasm")]
mod wasm_exports {
    use super::{LineageInput, LiveEventInput, SealInput, SignatureInput};
    use wasm_bindgen::prelude::*;

    fn parse<T: serde::de::DeserializeOwned>(input_json: &str) -> Result<T, JsValue> {
        serde_json::from_str(input_json).map_err(|error| JsValue::from_str(&error.to_string()))
    }

    #[wasm_bindgen]
    pub fn compute_seal_hash_json(input_json: &str) -> Result<String, JsValue> {
        let input: SealInput = parse(input_json)?;
        Ok(super::compute_seal_hash(&input))
    }

    #[wasm_bindgen]
    pub fn compute_live_event_hash_json(input_json: &str) -> Result<String, JsValue> {
        let input: LiveEventInput = parse(input_json)?;
        Ok(super::compute_live_event_hash(&input))
    }

    #[wasm_bindgen]
    pub fn compute_lineage_hash_json(input_json: &str) -> Result<String, JsValue> {
        let input: LineageInput = parse(input_json)?;
        Ok(super::compute_lineage_hash(&input))
    }

    #[wasm_bindgen]
    pub fn compute_block_hash_json(input_json: &str) -> Result<String, JsValue> {
        let input: serde_json::Value = parse(input_json)?;
        Ok(super::compute_block_hash(&input))
    }

    #[wasm_bindgen]
    pub fn compute_signature_hash_json(input_json: &str) -> Result<String, JsValue> {
        let input: SignatureInput = parse(input_json)?;
        Ok(super::compute_signature_hash(&input))
    }
}

#[cfg(test)]
mod tests {
    use super::{
        LineageInput, LiveEventInput, SealInput, SignatureInput, compute_block_hash,
        compute_lineage_hash, compute_live_event_hash, compute_seal_hash,
        compute_signature_hash,
    };
    use serde_json::json;

    #[test]
    fn seal_hash_is_stable_when_object_keys_move() {
        let left = SealInput {
            title: "MSA".to_string(),
            content: "{\"type\":\"doc\"}".to_string(),
            blocks: json!([{ "id": "a", "kind": "text", "attrs": { "b": 2, "a": 1 } }]),
            settings: json!({ "pageWidth": 816, "fontBody": "sora" }),
        };

        let right = SealInput {
            title: "MSA".to_string(),
            content: "{\"type\":\"doc\"}".to_string(),
            blocks: json!([{ "id": "a", "attrs": { "a": 1, "b": 2 }, "kind": "text" }]),
            settings: json!({ "fontBody": "sora", "pageWidth": 816 }),
        };

        assert_eq!(compute_seal_hash(&left), compute_seal_hash(&right));
    }

    #[test]
    fn live_event_hash_changes_with_previous_hash() {
        let base = LiveEventInput {
            document_id: "doc_1".to_string(),
            event_type: "signal".to_string(),
            source: "integration".to_string(),
            payload: json!({ "key": "crm.stage", "value": "signed" }),
            created_at: 1_726_300_000,
            previous_hash: None,
        };

        let next = LiveEventInput {
            previous_hash: Some("abc123".to_string()),
            ..base.clone()
        };

        assert_ne!(compute_live_event_hash(&base), compute_live_event_hash(&next));
    }

    #[test]
    fn lineage_hash_changes_when_parent_anchor_changes() {
        let base = LineageInput {
            document_id: "doc_1".to_string(),
            block_id: "payment_status".to_string(),
            block_hash: "block_hash".to_string(),
            previous_block_hash: Some("prev_hash".to_string()),
            parent_anchor_hash: Some("parent_v1".to_string()),
            change_type: "updated".to_string(),
            reason: Some("crm_sync".to_string()),
            how: Some("hubspot".to_string()),
            created_at: 1_726_300_100,
        };

        let changed = LineageInput {
            parent_anchor_hash: Some("parent_v2".to_string()),
            ..base.clone()
        };

        assert_ne!(compute_lineage_hash(&base), compute_lineage_hash(&changed));
    }

    #[test]
    fn block_hash_is_stable_when_keys_move() {
        let left = json!({
            "id": "sig_1",
            "blockType": "signature",
            "data": { "label": "Signer", "required": true }
        });
        let right = json!({
            "data": { "required": true, "label": "Signer" },
            "blockType": "signature",
            "id": "sig_1"
        });

        assert_eq!(compute_block_hash(&left), compute_block_hash(&right));
    }

    #[test]
    fn signature_hash_changes_with_signer_identity() {
        let base = SignatureInput {
            signer_name: "Alice Example".to_string(),
            block_id: "sig_1".to_string(),
            signature_data: "signed".to_string(),
        };

        let changed = SignatureInput {
            signer_name: "Bob Example".to_string(),
            ..base.clone()
        };

        assert_ne!(compute_signature_hash(&base), compute_signature_hash(&changed));
    }
}
