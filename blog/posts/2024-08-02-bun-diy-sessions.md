# Bun DIY: Sessions

Sessions allow you to store data about a visitor of your site. It is usually used to identify who is making a request, but you can store any arbitrary data in a session. Sessions aren't baked into Bun, so we'll be building out a simple cookie-based session library in this article.

## Approaches

There are two general ways to implement sessions:

1. Store session data in an encrypted cookie
2. Sotre session data in a database (Redis, Postgres, SQLite, etc), and store an unguessable random identifier in a cookie

To keep this article relatively short, we're only going to focus on one strategy, and that is the encrypted cookie approach. Using an encrypted cookie doesn't require us to manage a data store, and is generally transferrable to any project.

## Generating session encryption keys

Since our sessions require encryption, we'll need some encryption keys, and we'll want to store these in our config (`.env`) so that sessions survive application restarts. To generate session encryption keys, run:

```sh
bun lib/sessions/genkey.ts
```

This will print a `SESSION_KEYS` environment variable to the console which you can place in your application config.

Alternatively, you can generate new session keys programmatically by calling the `genkey` function which is exported from `lib/sessions`:

```ts
import { genkey } from 'lib/sessions';

const key = await genkey();
```

## Initializing the session middleware

To attach session capabilities to our server, we'll Initialize and attach the session middleware:

```ts
import { makeSessionMiddleware } from 'lib/sessions';

const sessionMiddleware = await makeSessionMiddleware();

const requestHandler = (req: Request): Response => new Response('TODO...');

Bun.serve({ port, fetch: sessionMiddlewa(requestHandler) });
```

By default, the session middleware reads the encryption keys from `process.env.SESSION_KEYS`. If you don't wish to use the `SESSION_KEYS` environment variable, you can pass your own keys into the middleware. Here's an example which is the equivalent of the previous one:

```ts
const sessionMiddleware = await makeSessionMiddleware({
  keys: process.env.SESSION_KEYS!.split(','),
});
```

## Creating and updating a session

To create (or modify) a session, use the `setSession` function, passing it a response and the session data. It returns a response which has the session cookie set.

```ts
import { setSession } from 'lib/sessions';

function hello(req: SessionRequest<any>): Response {
  const response = new Response(`Hello, ${req.session.username}!`);
  return setSession(response, { username: 'Jimbo' });
}
```

A more realistic example might be a typical login response:

```ts
function loginRedirect(userId: string): Response {
  const response = new Response('', {
    status: 303,
    headers: {
      Location: '/',
    },
  });
  return setSession(response, { userId });
}
```

## Reading session state

When a request has an active session, the session state can be accessed using the `request.session` property, as in this example request handler:

```ts
function hello(req: SessionRequest<any>): Response {
  return new Response(`Hello, ${req.session.username}!`);
}
```

## Revoking a session / logging out

If you want to end a session (log out), call `revokeSession` like so:

```ts
import { revokeSession } from 'lib/sessions';

function logout(req: Request): Response {
  return revokeSession(
    new Response('', {
      status: 303,
      headers: {
        Location: '/login',
      },
    }),
  );
}
```

## Key rotation

For security purposes, it makes sense to change your application's encryption key on a regular basis. If we only support one encryption key, changing that key would break all existing sessions, effectively logging out all users of your application. Since we presumably don't hate our users, we'll support up to N older encryption keys. N should be a small number, like 2-3. When we receive a request, we'll try to find the encryption key that was used to create the session cookie, and we'll re-encrypt the session with the latest key.

If the cookie is *so* old that its key has fallen off of our list, the user's session will fail to decrypt. In this scenario, we don't throw an exception. Instead, we write the error to the console, and treat the request as if it is unauthenticated (a logged out / undefined session).

## Security implications

When we set the session cookie, we restrict it in a number of ways in order to avoid common security pitfalls.

First, we prefix our cookie name with `__Host-` which ensures our cookie is [domain-locked](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#cookie_prefixes). (Our full cookie name is `__Host-session`.)

Then, we give the cookie the following attributes.

- `Secure` ensures that the cookie is not transmitted in plain text (it's only sent over https except on localhost)
- `HttpOnly` prevents client-side scripts from accessing the cookie
- `SameSite=Strict` prevents the browser from sending the cookie to other domains (mitigating some cross-site vulnerabilities)

The full cookie looks like this:

```
Set-Cookie: __Host-session={ENCRYPTED_VALUE}; SameSite=Strict; Secure; HttpOnly
```

For more details on cookies and security, [see the MDN documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies).

## Implementation details

Our session cookies are encrypted using `AES-GCM-256`. Our keys are represented as `base64url` encoded strings with some prefixes which allow us to support upgrading our encryption to a different algoirthm and key length.

Our key format is as follows:

```
{algorithm}:{key_length}:{base64url_encoded_key}
```

Here's an example key:

```
AES-GCM:256:avKuo13qK3JgbOJdAyeMkeZBRUOsR4AIj-qKWnlq-RI
```

It has a number of parts:

- `AES-GCM:` the algorithm used to generate the key
- `256:` the length used to generate the key
- `ww8fa...` the key itself, encoded as a `base64url` string

Our session cookies will be of the form:

```
{iv}:{encrypted_state}
```

Here's an example session cookie:

```
S99Z8e_kYnv2tosXDyfQz:7oo-s0K66-A446xttFfoA6nXDskiQVUFNURowRgcsoM
```

Which breaks down like so:

- `S99...:` the [iv](https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams#iv) used during encryption
- `7oo...` the encrypted session state

## Missing features: session expiration, revocation, etc

This implementation is missing a number of features that you might consider table-stakes. You should be able to layer such features on top. For example, this implementation does not have a way to revoke all sessions for a specific user, but it can be built fairly easily by:

- Adding `created_at` to the session state when you create a new session
- Storing a `sessions_revoked_at` value in your database for each user
- Creating a middleware that fetches the current user associated with the session
- Nullifying any sessions whose `created_at < sessions_revoked_at`

Another feature we're lacking is automatic session expiration. Most of my users prefer to stay logged in to my apps until they manually opt to logout, so I'm fine with no expiration. It does potentially pose a security risk for very secure applications, however. If your application needs session expiration, it's pretty easy to layer on using the time stamp approach suggested above. You might also use [standard cookie expiration](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie).

Most other session features that I've ever needed can be similarly layered on top of our simple implementation, so I'll leave such exercises up to the reader.

## Source

The source is below. For reference, the `lib/middleware` file looks like this:

```ts
import type { Server } from 'bun';

// The Bun Serve.fetch handler singnature
export type HTTPHandler = (request: Request, server: Server) => Response | Promise<Response>;

// The type signature of a middleware function
export type Middleware = (next: HTTPHandler) => HTTPHandler;
```

I wanted to write some tests for some of the internal functions in my session implementation, so I stored the bulk of the logic in `lib/sessions/seessions.ts` and wrote my tests against that. I then created an export of the public API in `lib/sessions/index.ts` which is detailed at the end of this article.

```ts
/**
 * This implements an encryption-based session cookie. We use AES-GCM-256
 * which is secure enough for our needs while still being fairly performant.
 *
 * This runs around 10K encrypt / decrypt operations in 350ms on my old
 * laptop, unplugged (low power mode). That's good enough.
 */

import type { Middleware } from 'lib/middleware';

/**
 * This is the type signature of a request that may have a session associated with it.
 */
export type SessionRequest<T> = Request & { session?: T };

/**
 * The type signature of a response that may have a session associated with it.
 */
export type SessionResponse<T> = Response & { session?: T };

/**
 * The arguments used to create the session middleware.
 */
type MiddlewareArgs = {
  keys?: string[];
};

/**
 * The start of the session cookie value.
 */
const sessionCookiePrefix = '__Host-session=';

/**
 * If response.session === revokeSymbol, it means the session should be cleared.
 */
const revokeSymbol = Symbol();

/**
 * The webcrypto object, pulled into a const for convenience.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
 */
const crypto = globalThis.crypto;

/**
 * The algorithm we'll use to encrypt / decrypt session cookies.
 */
const algo = { name: 'AES-GCM', length: 256 };

/**
 * Convert an item to a base64url-encoded string.
 */
const toBase64Url = (arr: any) => Buffer.from(arr).toString('base64url');

/**
 * Converters for converting strings to / from Uint8Array.
 */
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Extract the session cookie from a request. Return undefined if
 * no session cookie is found. This returns the *encrypted* session
 * cookie. Exported for testing purposes.
 */
export function extractSessionCookie(req: { headers: Headers }) {
  const cookie = req.headers.get('cookie');
  if (!cookie) {
    return;
  }
  const extractSession = (start: number) => {
    const semi = cookie.indexOf(';', start);
    return cookie.slice(start, semi < 0 ? cookie.length : semi);
  };
  let prefix = sessionCookiePrefix;
  if (cookie.startsWith(prefix)) {
    return extractSession(prefix.length);
  }
  prefix = `; ${prefix}`;
  const index = cookie.indexOf(prefix);
  return index < 0 ? undefined : extractSession(index + prefix.length);
}

/**
 * Parse the serialized encryption keys into CryptoKey instances.
 */
async function parseKeys(keys?: string[]): Promise<CryptoKey[]> {
  if (!keys?.length) {
    console.error(
      [
        `No encryption keys were provided to session middleware.`,
        `To generate encryption keys, run:`,
        `bun lib/sessions/genkey.ts`,
      ].join('\n'),
    );
    throw new Error(`session middleware keys not provided`);
  }
  return Promise.all(
    keys.map(async (serializedKey) => {
      const [algoName, algoLength, key64] = serializedKey.split(':');
      return await crypto.subtle.importKey(
        'raw',
        Buffer.from(key64, 'base64url'),
        {
          name: algoName,
          length: parseInt(algoLength, 10),
        },
        true,
        ['encrypt', 'decrypt'],
      );
    }),
  );
}

/**
 * Encrypt the payload, returning "iv:ciphertext" where iv is the base64url
 * encoded iv value, and ciphertext is the base64url-encoded encrypted payload.
 */
async function encrypt(key: CryptoKey, data: string) {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const ciphertext: ArrayBuffer = await crypto.subtle.encrypt(
    { name: algo.name, iv },
    key,
    textEncoder.encode(data),
  );
  return `${toBase64Url(iv)}:${toBase64Url(ciphertext)}`;
}

/**
 * Decrypt data, which is expected to be of the form "iv:ciphertext" as
 * produced by the encrypt function.
 */
async function decrypt(key: CryptoKey, iv64: string, data64: string) {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: algo.name,
      iv: Buffer.from(iv64, 'base64url'),
    },
    key,
    Buffer.from(data64, 'base64url'),
  );
  return textDecoder.decode(plaintext);
}

/**
 * Attempt to decrypt and parse the sesion cookie. If succesful, req.session
 * will be set to the parsed session state. This doesn't throw on error, but
 * it does log. The reason we avoid throwing is because we're going to get
 * errors during key rotation.
 */
async function parseSession(keys: CryptoKey[], req: SessionRequest<unknown>) {
  const encryptedSession = extractSessionCookie(req);
  if (!encryptedSession) {
    return;
  }
  const [iv64, data64] = encryptedSession.split(':', 4);
  for (const key of keys) {
    try {
      req.session = JSON.parse(await decrypt(key, iv64, data64));
      return key;
    } catch (err: any) {
      console.error(`[session] failed to decrypt or parse`, err.message);
    }
  }
}

/**
 * Write the specified value to the session cookie.
 */
async function writeSessionCookie(res: Response, value: string) {
  res.headers.append(
    'Set-Cookie',
    `${sessionCookiePrefix}${value}; SameSite=Strict; Secure; HttpOnly`,
  );
  return res;
}

/**
 * Generate a key which can be used for encrypting / decrypting session
 * cookies. This should be stored in .env or your application config.
 */
export async function genkey() {
  const key = await crypto.subtle.generateKey(algo, true, ['encrypt', 'decrypt']);
  const exported = await crypto.subtle.exportKey('raw', key);
  const key64 = toBase64Url(exported);
  return `${algo.name}:${algo.length}:${key64}`;
}

/**
 * Terminate the session, clearing the session cookie.
 */
export function revokeSession(res: Response) {
  return setSession(res, revokeSymbol);
}

/**
 * Create or modify the current session.
 */
export function setSession<T>(res: Response, data: T): SessionResponse<T> {
  const response = res as SessionResponse<T>;
  response.session = data;
  return response;
}

/**
 * Create a middleware function which attaches session state to incoming
 * requests, and sets / removes the session cookie from outgoing responses.
 */
export async function makeSessionMiddleware(args?: MiddlewareArgs): Promise<Middleware> {
  const keys = await parseKeys(args?.keys || process.env.SESSION_KEYS?.split(','));
  const [key] = keys;
  return (next) => async (req, server) => {
    const sessionRequest = req as SessionRequest<unknown>;
    const sessionKey = await parseSession(keys, sessionRequest);
    const res = (await next(sessionRequest, server)) as SessionResponse<unknown>;

```
// The session has been revoked; remove the cookie.
if (res.session === revokeSymbol) {
  return writeSessionCookie(res, '; Expires=0');
}

// If data is truthy, we've got a new session value (res.session), or we've
// done a key rotation (sessionKey !== key) so we need to re-write the session.
const data = res.session || (sessionKey !== key && sessionRequest.session);
if (data) {
  return writeSessionCookie(res, await encrypt(key, JSON.stringify(data)));
}
return res;
```
  };
}

```

## Public API

Here's the public API, exported from `lib/sessions/index.ts`:

```ts
export {
  type SessionRequest,
  type SessionResponse,
  genkey,
  revokeSession,
  setSession,
  makeSessionMiddleware,
} from './sessions';
```

## Genkey

And lastly, here's `lib/sessions/genkey.ts` which can be used to generate new session keys from the command line:

```ts
/**
 * A script which generates a new session key and prints out the
 * SESSION_KEYS environment variable with the new key prefixed.
 *
 * bun lib/sessions/genkey.ts
 */

import { genkey } from './sessions';

// We'll only keep the previous 2 keys around. If you wish to keep
// more around for some reason, you can manually add them back to
// your config.
const keys = (process.env.SESSION_KEYS || '')
  .split(',')
  .filter((s) => s)
  .slice(0, 2);

console.log();
console.log('Save the follwing in your .env or your application config:');
console.log();
console.log(`SESSION_KEYS=${[await genkey(), ...keys].join(',')}`);
console.log();
```

## Conclusion

And that's it; a basic session implementation with no dependencies outside of Bun itself. If you're interested in more Bun DIY articles, subscribe to the [rss feed](https://christophilus.com/feed.rss) to get notified when I post new ones.

