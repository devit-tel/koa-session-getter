import axios from 'axios';
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
    ctx = set(ctx, opts.sessionPath, { data: null, error });
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
    return data;
  } catch (error) {
    return { data: null, error };
  }
};

export const checkJWT = (ctx) => {
  if (get(ctx, 'user.data.sessionType') === 'jwt') {
    const { projectid, roleid } = ctx.request.header // case jwt
    if (projectid || roleid) {
    } else {
      throw new Error()
    }
  }
};

const getUserPermissions = (ctx) => {
  const { company } = ctx.user.data
  const { projectid, roleid } = ctx.request.header // case jwt
  let permissions = []
  Object.keys(company).map(name => {
    Object.keys(company[name].project).map(projName => {
      if (projectid && company[name].project[projName]._id !== projectid) return 
      if (company[name].project[projName].role) {
        Object.keys(company[name].project[projName].role).map(roleName => {
          if (roleid && company[name].project[projName].role[roleName]._id !== roleid) return 
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

export const hasAnyPermissions = (requiredPermissions: [string]) => async (
  ctx,
  next: Function,
) => {
  try {
    checkJWT(ctx)
  } catch (err) {
    ctx.status = 400
    ctx.body = {
      statusCode: 400,
      error: 'Missing header projectId or roleId',
      message: 'Authorization header is type JWT',
    }
    return
  }
  const userPermissions = getUserPermissions(ctx)
  ctx.user.data.permissions = userPermissions
  if (without(userPermissions, ...requiredPermissions).length < userPermissions.length) {
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

export const hasAllPermissions = (requiredPermissions: [string]) => async (
  ctx,
  next: Function,
) => {
  try {
    checkJWT(ctx)
  } catch (err) {
    ctx.status = 400
    ctx.body = {
      statusCode: 400,
      error: 'Missing header projectId or roleId for authorization type JWT',
      message: 'Missing header projectId or roleId for authorization type JWT',
    }
    return
  }
  const userPermissions = getUserPermissions(ctx)
  ctx.permissions = userPermissions
  if (intersection(userPermissions, requiredPermissions).length === requiredPermissions.length) {
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