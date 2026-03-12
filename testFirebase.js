const admin = require('firebase-admin');
const fs = require('fs');

const projectId = "shopvibe-admin";
const clientEmail = "firebase-adminsdk-fbsvc@shopvibe-admin.iam.gserviceaccount.com";
// Copy the key exactly as it is in the .env file (we'll simulate the load)
const rawKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCzIdYAxsm7KeXr\nVdB8fawHjqfmm3AWizLoAoXogkb7F0HNrsm9NGLK2LDIMd+DmKTxgXtjsXYnZNQo\nECd6qmQidj9mXtPXdfL8MylifpYMrw+9tNUZqhAqXByH4DdDWushqDmXcOtFS6+S\nh1/RWOsuoxVniBp8mLRtaqOqK6wXOhDCff+vX3ugAHRxE5RtCWjaCrBlEGq5KRpH\ntW154AK1m+VNAudMujUiLEP6v/Tqivs+6iCd5qud4A8mzpDAqcvFQv/UMJ1May8q\nJ2Wy7TBJOc3qU6P+cknzlS+1wBYLVWOT8XFrUZ/m+UqhuZ6vhrKQVrlkiOTkXgub\nDmuJCra9AgMBAAECggEAB/dnrPSqQ4/ciQpcYYZK7dzHCZ8yOAUcRYuug2A0gmsE\nHZQvUMy2iQwOfp9ohTx3DMOD+94doakJs2IWiLgbsxmm/lPrdWqqMf5KJ0vMZgeC\nD8nYlqcvcrF9K6t0dw3Lz7J2JI6cc/eRTmxaqJ+HpApo2QgemhnGH73tRek3zSI6\n+RnD4xTc4kKADLg76d+pHpiYTQwMK5lBPvViWmXBZ+NRXRguCe0P86S2DMMg02b5\nszdmD2ik4o4qIal0WghjvEzCrRnVL1PDLygN2TbSGB1T5rQnWPvN3XLwF1JsyzrQ\nbU1jl4XpTdfvAvgCOjs7RnoUyepcs/9BJ+uW+C044QKBgQDdKuf3504m+nJWNzrN\n0ZyqA31KzDcS0OozIO31woNWntPxlAsumLohzxSfKJVC1OUumGgPDavQNDyg89ZT\n1BsgQypumgQUTsT8oEtC7w0yUAh9I9hKDSxSxd14RWv8JyVGHTksLuGxGMtTtguy\nz5EXaU4QdtFaGzmrzptNgQYnoQKBgQDPWCJcd5UT33STN2Yrd8eRC+/JmTLxxcNC\nvmf261fM0QsFRm2XL2I/i6/qqoX2VhsqiR5u3DXiHywxnbec4G38mV10DnfmqMMZ\n5p0i5TF0AZowKgPc8yBfBS9SOyLeAu9f90gBdxD2clA7itVGm8CgeFgiP/P9q6fN\n+oMCpcfJnQKBgQCDLmfYisG4LOSUbr3aRnH+BYPTUb1406GWIfoCwxTT0/EyYPUg\n9kWwt/srTA78TPqC4LMX+qvmGpW7geWmYzCTukL4xzGUOgRtM0ZwtQnGxeHDF/e6\nNIYNsn7iT4r1TOK26651nnkPaf1v8ZKOxL7ye+tpqJAUOgHC/hDvr4/PAQKBgFZe\nLPn9aeC8TM/h3LIwk7WMllaQdRMWwK41qBLHl2wei4un+ZBnUXKM2jtSyriAx5Ih\Scb9/YfyWjNUsh4rskTtEWt9d15iX9qTIFNfywi6fiKf7boEoDBUdZC4R17ZNCLy\nW1EY6rztgxQ6UXq2+Dcfyf6CSz0YWq7HMflRWvZVAoGABMdIlBKaaRC8+ztme5VV\nmeBAT8+33CxrhUWbDVaEFuBkoxlxBQtHGkJJynzLHSVVf+Hh14NvLnLz6mDmJoav\nsZNvdnzRXs8M2XlNlOfFf6iSOb2lJ9/TsDpDj+DJyD7M5VX1bO5vivaqw36eztJ+\nqaiJbWnVfUm+cS1MzYNqd/A=\n-----END PRIVATE KEY-----\n";

const privateKey = rawKey.replace(/\\n/g, '\n');

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log('Success: Firebase Admin initialized!');
} catch (err) {
  console.error('Error:', err.message);
}
