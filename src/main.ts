import axios from 'axios';
import { set, get } from 'lodash'

type Options = {
  url: string;
  authorizationPath: [string];
  sessionPath: [string];
};

var defaultOptions = {
  url: 'http://localhost:3000/v2/sessions',
  authorizationPath: ['request', 'headers', 'authorization'],
  sessionPath: ['state', 'user'],
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
    });
    return data;
  } catch (error) {
    return { data: null, error };
  }
};
