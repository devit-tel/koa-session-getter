import axios from 'axios'
import { set, get, without, intersection } from 'lodash'
import { decode } from 'jsonwebtoken'

type Options = {
  url: string;
  authorizationPath: [string];
  sessionPath: [string];
  httpOptions: any
};

var defaultOptions = {
  url: 'http://localhost:3000/v2/sessions',
  userUrl: 'http://localhost:3000/v1/users',
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
    const token = get(get(ctx, opts.authorizationPath).split(' '), '1')
    const decoded = decode(token)
    const { userId } = decoded
    if (!userId) {
      return { data: null, error };
    }
    const { data } = await axios({
        method: 'GET',
        url: `${opts.userUrl}/${userId}`,
        ...opts.httpOptions
    }).catch(() => {
      return { data: null, error };
    })
    const response = {
      user:  get(data, 'data'),
      userId: get(data, 'data._id')
    }

    return { data: response }
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
  company.map((companyObj: any) => {
    companyObj.project.map((projectObj: any) => {
      if (projectId) {
        if (projectObj._id !== projectId) {
          return
        }
      }
      if (projectObj.role && projectObj.role.length > 0) {
        projectObj.role.map((roleObj: any) => {
          if (roleId) {
            if (roleObj._id !== roleId) {
              return
            }
          }
          permissions = permissions.concat(roleObj.permissions)
        })
      }
      if (projectObj.app && projectObj.app.length > 0) {
        projectObj.app.map(appObj => {
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