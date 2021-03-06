# koa-session-getter
koa's middleware that get user infomation using JWT by http (GET), and parse to ctx.

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
    url: 'http://localhost:3000/v2/sessions',
    authorizationPath: ['request', 'headers', 'authorization'],
    sessionPath: ['state', 'user'],
    httpOptions: {
      timeout: 1000
    }
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
  url: 'http://localhost:3000/v2/sessions',
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

### Example3
Use function check Permissions, default path is ctx.user.data

```javascript
import { HttpMethod, route } from '@spksoft/koa-decorator'
import { getSessionMiddleware, setOptions, hasAnyPermissions, hasAllPermissions } from 'koa-session-getter'

// Set as default value
setOptions({
  url: 'http://localhost:3000/v2/sessions',
  authorizationPath: ['request', 'headers', 'authorization'],
  sessionPath: ['state', 'user']
})

@route('/v1/system')
class SystemController {
  // Overide default options
  @route('/check', HttpMethod.GET, getSessionMiddleware(), hasAnyPermissions(['EDIT_PERMISSION', 'DELETE_PERMISSION']))
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

### Example4
Override default path to ctx

```javascript
import { HttpMethod, route } from '@spksoft/koa-decorator'
import { getSessionMiddleware, setOptions, hasAnyPermissions, hasAllPermissions } from 'koa-session-getter'

// Set as default value
setOptions({
  url: 'http://localhost:3000/v2/sessions',
  authorizationPath: ['request', 'headers', 'authorization'],
  sessionPath: ['state', 'user']
})

@route('/v1/system')
class SystemController {
  // Overide default options
  @route('/check', HttpMethod.GET, getSessionMiddleware(), hasAnyPermissions(['EDIT_PERMISSION', 'DELETE_PERMISSION'], 'user.xxx'))
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
