"""
PayOS UCP Settlement Example (Python)

This example demonstrates how to:
1. Get an FX quote
2. Acquire a settlement token
3. Execute the settlement
4. Check settlement status

Requirements:
    pip install requests
"""

import os
import time
import requests
from typing import Dict, Any, Optional

PAYOS_API_KEY = os.getenv("PAYOS_API_KEY", "pk_test_...")
PAYOS_BASE_URL = os.getenv("PAYOS_BASE_URL", "https://api.payos.com")


class PayOSUCPClient:
    """Simple client for PayOS UCP API."""

    def __init__(self, api_key: str, base_url: str = "https://api.payos.com"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "UCP-Agent": "PythonExample/2026-01-11",
        }

    def get_quote(
        self, corridor: str, amount: float, currency: str
    ) -> Dict[str, Any]:
        """Get an FX quote for a settlement corridor."""
        response = requests.post(
            f"{self.base_url}/v1/ucp/quote",
            headers=self.headers,
            json={"corridor": corridor, "amount": amount, "currency": currency},
        )
        response.raise_for_status()
        return response.json()

    def acquire_token(
        self,
        corridor: str,
        amount: float,
        currency: str,
        recipient: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Acquire a settlement token."""
        payload = {
            "corridor": corridor,
            "amount": amount,
            "currency": currency,
            "recipient": recipient,
        }
        if metadata:
            payload["metadata"] = metadata

        response = requests.post(
            f"{self.base_url}/v1/ucp/tokens",
            headers=self.headers,
            json=payload,
        )
        response.raise_for_status()
        return response.json()

    def settle(
        self, token: str, idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute settlement with token."""
        payload = {"token": token}
        if idempotency_key:
            payload["idempotency_key"] = idempotency_key

        response = requests.post(
            f"{self.base_url}/v1/ucp/settle",
            headers=self.headers,
            json=payload,
        )
        response.raise_for_status()
        return response.json()

    def get_settlement_status(self, settlement_id: str) -> Dict[str, Any]:
        """Get settlement status."""
        response = requests.get(
            f"{self.base_url}/v1/ucp/settlements/{settlement_id}",
            headers=self.headers,
        )
        response.raise_for_status()
        return response.json()

    def wait_for_completion(
        self, settlement_id: str, max_wait_seconds: int = 120
    ) -> Dict[str, Any]:
        """Wait for settlement to complete."""
        start_time = time.time()

        while time.time() - start_time < max_wait_seconds:
            status = self.get_settlement_status(settlement_id)

            if status["status"] == "completed":
                return status

            if status["status"] == "failed":
                raise Exception(f"Settlement failed: {status.get('failure_reason')}")

            # Wait 2 seconds before polling again
            time.sleep(2)

        raise Exception("Settlement timed out")


def create_pix_recipient(
    pix_key: str,
    pix_key_type: str,
    name: str,
    tax_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a Pix recipient object."""
    recipient = {
        "type": "pix",
        "pix_key": pix_key,
        "pix_key_type": pix_key_type,
        "name": name,
    }
    if tax_id:
        recipient["tax_id"] = tax_id
    return recipient


def create_spei_recipient(
    clabe: str,
    name: str,
    rfc: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a SPEI recipient object."""
    recipient = {
        "type": "spei",
        "clabe": clabe,
        "name": name,
    }
    if rfc:
        recipient["rfc"] = rfc
    return recipient


def main():
    """Example: Complete a Pix settlement."""
    print("PayOS UCP Settlement Example (Python)\n")

    # Initialize client
    client = PayOSUCPClient(PAYOS_API_KEY, PAYOS_BASE_URL)

    # Step 1: Get a quote
    print("1. Getting FX quote...")
    quote = client.get_quote("pix", 100, "USD")
    print(f"   Quote: ${quote['from_amount']} USD = R${quote['to_amount']} BRL")
    print(f"   Rate: {quote['fx_rate']}, Fees: ${quote['fees']}")
    print(f"   Expires: {quote['expires_at']}\n")

    # Step 2: Acquire a settlement token
    print("2. Acquiring settlement token...")
    recipient = create_pix_recipient(
        pix_key="maria@email.com",
        pix_key_type="email",
        name="Maria Silva",
    )
    token_response = client.acquire_token(
        corridor="pix",
        amount=100,
        currency="USD",
        recipient=recipient,
        metadata={
            "order_id": "order_12345",
            "customer_email": "customer@example.com",
        },
    )
    print(f"   Token: {token_response['token'][:20]}...")
    print(f"   Settlement ID: {token_response['settlement_id']}")
    print(f"   Locked rate: {token_response['quote']['fx_rate']}")
    print(f"   Expires: {token_response['expires_at']}\n")

    # Step 3: Execute settlement
    print("3. Executing settlement...")
    settlement = client.settle(
        token=token_response["token"],
        idempotency_key=f"order_12345_{int(time.time())}",
    )
    print(f"   Status: {settlement['status']}")
    print(f"   Estimated completion: {settlement.get('estimated_completion')}\n")

    # Step 4: Wait for completion
    print("4. Waiting for settlement to complete...")
    completed = client.wait_for_completion(settlement["id"])
    print(f"   Final status: {completed['status']}")
    print(f"   Transfer ID: {completed.get('transfer_id')}")
    print(f"   Completed at: {completed.get('completed_at')}\n")

    print("✅ Settlement complete!")
    print(f"   Amount sent: R${token_response['quote']['to_amount']} BRL")
    print(f"   Recipient: Maria Silva (maria@email.com)")


if __name__ == "__main__":
    main()
