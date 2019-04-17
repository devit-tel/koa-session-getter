# conductor-client

### Install

`npm i -s koa-session-getter`

### Example
Use as middleware

```javascript
import { HttpMethod, route } from '@spksoft/koa-decorator'
import { getSessionMiddleware } from 'koa-session-getter'

@route('/v1/system')
class SystemController {
  // Overide default options
  @route('/check', HttpMethod.GET, getSessionMiddleware({
    url: 'https://kong-api.staging.sendit.asia/user/v2/sessions',
    authorizationPath: ['request', 'headers', 'authorization'],
    sessionPath: ['state', 'user']
  }))
  async check(ctx) {
    ctx.body = {
      query: ctx.query,
      headers: ctx.headers,
      state: ctx.state
    }
  }
}

export default SystemController
```

### Example2
Set global options

```javascript
import { HttpMethod, route } from '@spksoft/koa-decorator'
import { getSessionMiddleware, setOptions } from 'koa-session-getter'

// Set as default value
setOptions({
  url: 'https://kong-api.staging.sendit.asia/user/v2/sessions',
  authorizationPath: ['request', 'headers', 'authorization'],
  sessionPath: ['state', 'user']
})

@route('/v1/system')
class SystemController {
  // Overide default options
  @route('/check', HttpMethod.GET, getSessionMiddleware({
      sessionPath: ['state', 'user']
  }))
  async check(ctx) {
    ctx.body = {
      query: ctx.query,
      headers: ctx.headers,
      state: ctx.state
    }
  }
}

export default SystemController
```
