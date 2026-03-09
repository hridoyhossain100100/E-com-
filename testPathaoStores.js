const PATHAO_BASE_URL = "https://courier-api-sandbox.pathao.com";
const PATHAO_CLIENT_ID = "7N1aMJQbWm";
const PATHAO_CLIENT_SECRET = "wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39";
const PATHAO_USERNAME = "test@pathao.com";
const PATHAO_PASSWORD = "lovePathao";

async function run() {
    try {
        console.log("Getting token...");
        const tokenRes = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/issue-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: PATHAO_CLIENT_ID,
                client_secret: PATHAO_CLIENT_SECRET,
                username: PATHAO_USERNAME,
                password: PATHAO_PASSWORD,
                grant_type: 'password',
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(JSON.stringify(tokenData));

        console.log("Token received, fetching stores...");
        const storesRes = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/stores`, {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/json',
            }
        });

        const storesData = await storesRes.json();
        require('fs').writeFileSync('test_stores_valid.json', JSON.stringify(storesData, null, 2), 'utf-8');
        console.log("Stores response written to test_stores_valid.json");
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
