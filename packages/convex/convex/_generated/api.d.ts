/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as actions from "../actions.js";
import type * as articles from "../articles.js";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as conversations from "../conversations.js";
import type * as files from "../files.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as ideas from "../ideas.js";
import type * as inspirations from "../inspirations.js";
import type * as stocks from "../stocks.js";
import type * as telegram from "../telegram.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  actions: typeof actions;
  articles: typeof articles;
  auth: typeof auth;
  categories: typeof categories;
  conversations: typeof conversations;
  files: typeof files;
  helpers: typeof helpers;
  http: typeof http;
  ideas: typeof ideas;
  inspirations: typeof inspirations;
  stocks: typeof stocks;
  telegram: typeof telegram;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
