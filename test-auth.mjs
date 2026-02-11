// Simple test script to verify auth flow
import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          cookies: res.headers['set-cookie']
        });
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testAuth() {
  console.log('=== Testing Auth Flow ===\n');
  
  // Step 1: Login
  console.log('1. Testing login...');
  const loginData = JSON.stringify({ username: 'admin', password: '1234' });
  
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, loginData);
  
  console.log(`   Status: ${loginRes.statusCode}`);
  console.log(`   Response: ${loginRes.body}`);
  
  if (loginRes.cookies) {
    console.log(`   Cookies received: ${loginRes.cookies.length}`);
    loginRes.cookies.forEach((cookie, i) => {
      console.log(`   Cookie ${i + 1}: ${cookie.substring(0, 80)}...`);
    });
    
    // Extract session cookie
    const sessionCookie = loginRes.cookies.find(c => c.startsWith('session='));
    if (sessionCookie) {
      console.log('\n2. Testing /api/auth/me with session cookie...');
      
      const meRes = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/me',
        method: 'GET',
        headers: {
          'Cookie': sessionCookie
        }
      });
      
      console.log(`   Status: ${meRes.statusCode}`);
      console.log(`   Response: ${meRes.body}`);
      
      if (meRes.statusCode === 200) {
        const body = JSON.parse(meRes.body);
        if (body.ok) {
          console.log('\n✅ SUCCESS: Session cookie is working correctly!');
          console.log(`   User: ${body.user.username}`);
          console.log(`   Role: ${body.user.role}`);
        } else {
          console.log('\n❌ FAILED: Session verification failed');
        }
      } else {
        console.log('\n❌ FAILED: Could not verify session');
      }
    } else {
      console.log('\n❌ FAILED: No session cookie received');
    }
  } else {
    console.log('\n❌ FAILED: No cookies received from login');
  }
}

testAuth().catch(console.error);
