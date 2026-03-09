const PATHAO_BASE_URL = "https://api-hermes.pathao.com";
const PATHAO_CLIENT_ID = "openzm5e7A";
const PATHAO_CLIENT_SECRET = "Q8K2u5q90VVZnHv55cPPVufGtNRyWV14YZPUcyui";
const PATHAO_USERNAME = "hridoyhossain1088@gmail.com";
const PATHAO_PASSWORD = "01861601745@Hkkk";

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
        console.log("Token response status:", tokenRes.status);
        console.log("Token response body:", JSON.stringify(tokenData));
        if (!tokenRes.ok) return;

        console.log("Token received, fetching stores...");
        const storesRes = await fetch(`${PATHAO_BASE_URL}/aladdin/api/v1/stores`, {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/json',
            }
        });

        const storesData = await storesRes.json();
        console.log("Stores response:", JSON.stringify(storesData, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
