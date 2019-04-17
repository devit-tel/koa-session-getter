import url from 'url';
import axios from 'axios';
import { get, set, lensPath } from 'ramda';

type Options = {
  url: string;
  authorizationPath: [string];
  sessionPath: [string];
};

var defaultOptions = {
  url: 'https://kong-api.staging.sendit.asia/user/v2/sessions',
  authorizationPath: ['request', 'headers'],
  sessionPath: ['state', 'user'],
};

export const setOptions = (options: Options) => {
  defaultOptions = { ...defaultOptions, ...options };
  return defaultOptions
}

export const getSessionMiddleware = (options: Options) => async (
  ctx,
  next: Function,
) => {
  const opts = { ...defaultOptions, ...options };
  try {
    ctx = set(lensPath(opts.sessionPath), await getSession(ctx, options), ctx);
  } catch (error) {
    ctx = set(lensPath(opts.sessionPath), { data: null, error }, ctx);
  } finally {
    return next();
  }
};

export const getSession = async (ctx, options: Options) => {
  const opts = { ...defaultOptions, ...options };
  try {
    const { data } = await axios({
      method: 'GET',
      url: url.resolve(opts.url, get(opts.authorizationPath, ctx)),
    });
    return data;
  } catch (error) {
    return { data: null, error };
  }
};
