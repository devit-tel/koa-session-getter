import axios from 'axios'
import { set, get, without, intersection } from 'lodash'

class Unauthorized extends Error {
  constructor (message) {
    super(message); // (1)
    this.statusCode = 401
    this.name = 'Unauthorized'
    this.message = message
  }
}

class BadRequest extends Error {
  constructor (message) {
    super(message); // (1)
    this.statusCode = 400
    this.name = 'Bad Request'
    this.message = message
  }
}

export const error = {
  Unauthorized,
  BadRequest,
}

type Options = {
  url: string;
  authorizationPath: [string];
  sessionPath: [string];
  httpOptions: any
};

let defaultOptions = {
  url: 'http://localhost:3000/v2/sessions',
  authorizationPath: ['request', 'headers', 'authorization'],
  sessionPath: ['state', 'user'],
  httpOptions: {}
};

const getProjectId = (ctx: any) => {
  return get(ctx, 'request.headers.project-id') || get(ctx, 'headers.project-id')
}

const getRoleId = (ctx: any) => {
  return get(ctx, 'request.headers.role-id') || get(ctx, 'headers.role-id')
}

export const setOptions = (options: Options) => {
  defaultOptions = { ...defaultOptions, ...options };

  return defaultOptions;
};

export const getSessionMiddleware = (options: Options) => async (
  ctx,
  next: Function,
) => {
  const opts = { ...defaultOptions, ...options };
  try {
    ctx = set(ctx, opts.sessionPath, await getSession(ctx, options))
  } catch (error) {
    throw error
    // ctx = set(ctx, opts.sessionPath, { error });
  } finally {
    return next();
  }
};

export const getSession = async (ctx: any, options: Options) => {
  const opts = { ...defaultOptions, ...options }
  const userHeaders = {
      ['project-id']: getProjectId(ctx),
      ['role-id']: getRoleId(ctx)
  }
  if (!getProjectId(ctx)) {
    delete userHeaders['project-id'];
  }
  if (!getRoleId(ctx)) {
    delete userHeaders['role-id'];
  }
  try {
    const { data } = await axios({
      method: 'GET',
      url: opts.url,
      headers: {
        authorization: get(ctx,  opts.authorizationPath),
        ...userHeaders,
      },
      ...opts.httpOptions
    })
    return get(data, 'data')
  } catch (error) {
    throw new Unauthorized('Session not found')
  }
};

export const checkJWT = (ctx: any, path?: string) => {
  const sessionType = path ? get(ctx, `${path}.sessionType`) : get(ctx, 'user.sessionType')
  if (sessionType === 'jwt') {
    const projectId = getProjectId(ctx)
    const roleId = getRoleId(ctx)
    if (projectId || roleId) {
    } else {
      throw new BadRequest('Missing header projectId or roleId for authorization type jwt')
    }
  }
};

const getUserPermissions = (ctx: any, path?: string) => {
  const company = path ? get(ctx, `${path}.company`, []) : get(ctx, 'user.company', [])
  const projectId = getProjectId(ctx)
  const roleId = getRoleId(ctx)
  let permissions = []
  company.map((companyObj: any) => {
    get(companyObj, 'project', []).map((projectObj: any) => {
      if (projectId) {
        if (projectObj._id !== projectId) {
          return
        }
      }
      if (projectObj.role && projectObj.role.length > 0) {
        get(projectObj, 'role', []).map((roleObj: any) => {
          if (roleId) {
            if (roleObj._id !== roleId) {
              return
            }
          }
          permissions = permissions.concat(roleObj.permissions)
        })
      }
      if (projectObj.app && projectObj.app.length > 0) {
        get(projectObj, 'app', []).map(appObj => {
          permissions = permissions.concat(appObj.permissions)
        })
      }
    })
  })

  return permissions
}

export const hasAnyPermissions = (requiredPermissions: [string], path?: string) => async (
  ctx,
  next: Function,
) => {
  checkJWT(ctx, path)
  if (hasAnyPermissionsBool(ctx, requiredPermissions, path)) {
    await next()
  } else {
    throw new Unauthorized('Permission denied')
  }
};

export const hasAllPermissions = (requiredPermissions: [string], path?: string) => async (
  ctx,
  next: Function,
) => {
  checkJWT(ctx, path)
  if (hasAllPermissionBool(ctx, requiredPermissions, path)) {
    await next()
  } else {
    throw new Unauthorized('Permission denied')
  }
}

export const hasAnyPermissionsBool = (ctx: any, requiredPermissions: [string], path?: string) => {
  const userPermissions = getUserPermissions(ctx, path)
  
  return without(userPermissions, ...requiredPermissions).length < userPermissions.length
}
export const hasAllPermissionBool = (ctx: any, requiredPermissions: [string], path?: string) => {
  const userPermissions = getUserPermissions(ctx, path)

  return intersection(userPermissions, requiredPermissions).length === requiredPermissions.length
}