import axios from 'axios'
import { set, get, without, intersection } from 'lodash'

type Options = {
  url: string;
  authorizationPath: [string];
  sessionPath: [string];
  httpOptions: any
};

var defaultOptions = {
  url: 'http://localhost:3000/v2/sessions',
  authorizationPath: ['request', 'headers', 'authorization'],
  sessionPath: ['state', 'user'],
  httpOptions: {}
};

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
    ctx = set(ctx, opts.sessionPath, await getSession(ctx, options));
  } catch (error) {
    ctx = set(ctx, opts.sessionPath, { error });
  } finally {
    return next();
  }
};

export const getSession = async (ctx, options: Options) => {
  const opts = { ...defaultOptions, ...options };
  try {
    const { data } = await axios({
      method: 'GET',
      url: opts.url,
      headers: {
        authorization: get(ctx, opts.authorizationPath),
      },
      ...opts.httpOptions
    });
    return get(data, 'data');
  } catch (error) {
    return { data: null, error };
  }
};

export const checkJWT = (ctx: any, path?: string) => {
  const sessionType = path ? get(ctx, `${path}.sessionType`) : get(ctx, 'user.sessionType')
  if (sessionType === 'jwt') {
    const projectId = get(ctx, 'request.header.project-id')
    const roleId = get(ctx, 'request.header.role-id')
    if (projectId || roleId) {
    } else {
      throw new Error()
    }
  }
};

const getUserPermissions = (ctx: any, path?: string) => {
  const company = path ? get(ctx, `${path}.company`) : get(ctx, 'user.company')
  const projectId = get(ctx, 'request.header.project-id') || get(ctx, 'header.project-id')
  const roleId = get(ctx, 'request.header.role-id') || get(ctx, 'header.role-id')
  let permissions = []
  Object.keys(company).map(name => {
    Object.keys(company[name].project).map(projName => {
      if (projectId) {
        if (company[name].project[projName]._id !== projectId) return 
      }
      if (company[name].project[projName].role) {
        Object.keys(company[name].project[projName].role).map(roleName => {
          if (roleId) {
            if (company[name].project[projName].role[roleName]._id !== roleId) return 
          }
          permissions = permissions.concat(company[name].project[projName].role[roleName].permissions)
        })
      }
      if (company[name].project[projName].appName) {
        Object.keys(company[name].project[projName].appName).map(appName => {
          permissions = permissions.concat(company[name].project[projName].appName[appName].permissions)
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
  try {
    checkJWT(ctx, path)
  } catch (err) {
    ctx.status = 400
    ctx.body = {
      statusCode: 400,
      error: 'Missing header projectId or roleId',
      message: 'Authorization header is type JWT',
    }
    return
  }
  if (hasAnyPermissionsBool(ctx, requiredPermissions, path)) {
    await next()
  } else {
    ctx.status = 401
    ctx.body = {
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Unauthorized',
    }
  }
};

export const hasAllPermissions = (requiredPermissions: [string], path?: string) => async (
  ctx,
  next: Function,
) => {
  try {
    checkJWT(ctx, path)
  } catch (err) {
    ctx.status = 400
    ctx.body = {
      statusCode: 400,
      error: 'Missing header projectId or roleId for authorization type JWT',
      message: 'Missing header projectId or roleId for authorization type JWT',
    }
    return
  }
  if (hasAllPermissionBool(ctx, requiredPermissions, path)) {
    await next()
  } else {
    ctx.status = 401
    ctx.body = {
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Unauthorized',
    }
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