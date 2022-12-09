import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Date: any;
  JSON: any;
};

export type FeedItem = Playlist | Track;

export type Playlist = {
  __typename?: 'Playlist';
  activity_timestamp?: Maybe<Scalars['String']>;
  created_at: Scalars['String'];
  description?: Maybe<Scalars['String']>;
  favorite_count: Scalars['Int'];
  favorited_by: Array<User>;
  id: Scalars['String'];
  is_reposted: Scalars['Boolean'];
  is_saved: Scalars['Boolean'];
  name: Scalars['String'];
  owner: User;
  repost_count: Scalars['Int'];
  reposted_by: Array<User>;
  tracks: Array<Track>;
};


export type PlaylistFavorited_ByArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};


export type PlaylistReposted_ByArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};


export type PlaylistTracksArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};

export enum PlaylistSort {
  Name = 'name',
  RepostCount = 'repost_count'
}

export type Query = {
  __typename?: 'Query';
  feed: Array<FeedItem>;
  track?: Maybe<Track>;
  user?: Maybe<User>;
  users: Array<User>;
  wip_notifications?: Maybe<Scalars['JSON']>;
};


export type QueryFeedArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  original?: InputMaybe<Scalars['Boolean']>;
  reposts?: InputMaybe<Scalars['Boolean']>;
};


export type QueryTrackArgs = {
  permalink: Scalars['String'];
};


export type QueryUserArgs = {
  handle?: InputMaybe<Scalars['String']>;
};


export type QueryUsersArgs = {
  has_favorited_track_id?: InputMaybe<Scalars['ID']>;
  has_reposted_track_id?: InputMaybe<Scalars['ID']>;
  is_followed_by_current_user?: InputMaybe<Scalars['Boolean']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
};

export enum SizeSquare {
  '150x150' = '_150x150',
  '480x480' = '_480x480',
  '1000x1000' = '_1000x1000'
}

export enum SizeWidth {
  '640x' = '_640x',
  '2000x' = '_2000x'
}

export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type Track = {
  __typename?: 'Track';
  activity_timestamp?: Maybe<Scalars['String']>;
  cover_art_urls: Array<Scalars['String']>;
  created_at: Scalars['String'];
  favorite_count: Scalars['Int'];
  favorited_by: Array<User>;
  id: Scalars['String'];
  is_reposted: Scalars['Boolean'];
  is_saved: Scalars['Boolean'];
  length: Scalars['Int'];
  owner: User;
  permalink: Scalars['String'];
  repost_count: Scalars['Int'];
  reposted_by: Array<User>;
  stream_urls: Array<Scalars['String']>;
  title: Scalars['String'];
};


export type TrackCover_Art_UrlsArgs = {
  size?: SizeSquare;
};


export type TrackFavorited_ByArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};


export type TrackReposted_ByArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};

export enum TrackSort {
  Length = 'length',
  RepostCount = 'repost_count',
  Title = 'title'
}

export type User = {
  __typename?: 'User';
  bio?: Maybe<Scalars['String']>;
  cover_photo_urls: Array<Scalars['String']>;
  follower_count: Scalars['Int'];
  followers: Array<User>;
  following: Array<User>;
  following_count: Scalars['Int'];
  handle: Scalars['String'];
  id: Scalars['String'];
  is_followed: Scalars['Boolean'];
  is_follower: Scalars['Boolean'];
  location?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  playlists: Array<Playlist>;
  profile_picture_urls: Array<Scalars['String']>;
  reposted_playlists: Array<Playlist>;
  reposted_tracks: Array<Track>;
  tracks: Array<Track>;
};


export type UserCover_Photo_UrlsArgs = {
  size?: SizeWidth;
};


export type UserFollowersArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
  sort?: InputMaybe<UserSort>;
  sort_direction?: InputMaybe<SortDirection>;
};


export type UserFollowingArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
  sort?: InputMaybe<UserSort>;
  sort_direction?: InputMaybe<SortDirection>;
};


export type UserPlaylistsArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
  sort?: InputMaybe<PlaylistSort>;
  sort_direction?: InputMaybe<SortDirection>;
};


export type UserProfile_Picture_UrlsArgs = {
  size?: SizeSquare;
};


export type UserReposted_TracksArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
  sort?: InputMaybe<TrackSort>;
  sort_direction?: InputMaybe<SortDirection>;
};


export type UserTracksArgs = {
  id?: InputMaybe<Scalars['ID']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  query?: InputMaybe<Scalars['String']>;
  sort?: InputMaybe<TrackSort>;
  sort_direction?: InputMaybe<SortDirection>;
};

export enum UserSort {
  FollowerCount = 'follower_count',
  FollowingCount = 'following_count',
  Handle = 'handle',
  Name = 'name'
}



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
  Date: ResolverTypeWrapper<Scalars['Date']>;
  FeedItem: ResolversTypes['Playlist'] | ResolversTypes['Track'];
  ID: ResolverTypeWrapper<Scalars['ID']>;
  Int: ResolverTypeWrapper<Scalars['Int']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']>;
  Playlist: ResolverTypeWrapper<Playlist>;
  PlaylistSort: PlaylistSort;
  Query: ResolverTypeWrapper<{}>;
  SizeSquare: SizeSquare;
  SizeWidth: SizeWidth;
  SortDirection: SortDirection;
  String: ResolverTypeWrapper<Scalars['String']>;
  Track: ResolverTypeWrapper<Track>;
  TrackSort: TrackSort;
  User: ResolverTypeWrapper<User>;
  UserSort: UserSort;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean'];
  Date: Scalars['Date'];
  FeedItem: ResolversParentTypes['Playlist'] | ResolversParentTypes['Track'];
  ID: Scalars['ID'];
  Int: Scalars['Int'];
  JSON: Scalars['JSON'];
  Playlist: Playlist;
  Query: {};
  String: Scalars['String'];
  Track: Track;
  User: User;
};

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export type FeedItemResolvers<ContextType = any, ParentType extends ResolversParentTypes['FeedItem'] = ResolversParentTypes['FeedItem']> = {
  __resolveType: TypeResolveFn<'Playlist' | 'Track', ParentType, ContextType>;
};

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type PlaylistResolvers<ContextType = any, ParentType extends ResolversParentTypes['Playlist'] = ResolversParentTypes['Playlist']> = {
  activity_timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  favorite_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  favorited_by?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<PlaylistFavorited_ByArgs, 'limit' | 'offset'>>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  is_reposted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  is_saved?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  owner?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  repost_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reposted_by?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<PlaylistReposted_ByArgs, 'limit' | 'offset'>>;
  tracks?: Resolver<Array<ResolversTypes['Track']>, ParentType, ContextType, RequireFields<PlaylistTracksArgs, 'limit' | 'offset'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  feed?: Resolver<Array<ResolversTypes['FeedItem']>, ParentType, ContextType, RequireFields<QueryFeedArgs, 'limit' | 'original' | 'reposts'>>;
  track?: Resolver<Maybe<ResolversTypes['Track']>, ParentType, ContextType, RequireFields<QueryTrackArgs, 'permalink'>>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, Partial<QueryUserArgs>>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryUsersArgs, 'limit' | 'offset'>>;
  wip_notifications?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
};

export type TrackResolvers<ContextType = any, ParentType extends ResolversParentTypes['Track'] = ResolversParentTypes['Track']> = {
  activity_timestamp?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  cover_art_urls?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType, RequireFields<TrackCover_Art_UrlsArgs, 'size'>>;
  created_at?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  favorite_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  favorited_by?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<TrackFavorited_ByArgs, 'limit' | 'offset'>>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  is_reposted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  is_saved?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  length?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  owner?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  permalink?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  repost_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reposted_by?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<TrackReposted_ByArgs, 'limit' | 'offset'>>;
  stream_urls?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  bio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  cover_photo_urls?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType, RequireFields<UserCover_Photo_UrlsArgs, 'size'>>;
  follower_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  followers?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<UserFollowersArgs, 'limit' | 'offset'>>;
  following?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, RequireFields<UserFollowingArgs, 'limit' | 'offset'>>;
  following_count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  handle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  is_followed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  is_follower?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  playlists?: Resolver<Array<ResolversTypes['Playlist']>, ParentType, ContextType, RequireFields<UserPlaylistsArgs, 'limit' | 'offset'>>;
  profile_picture_urls?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType, RequireFields<UserProfile_Picture_UrlsArgs, 'size'>>;
  reposted_playlists?: Resolver<Array<ResolversTypes['Playlist']>, ParentType, ContextType>;
  reposted_tracks?: Resolver<Array<ResolversTypes['Track']>, ParentType, ContextType, RequireFields<UserReposted_TracksArgs, 'limit' | 'offset'>>;
  tracks?: Resolver<Array<ResolversTypes['Track']>, ParentType, ContextType, RequireFields<UserTracksArgs, 'limit' | 'offset'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  Date?: GraphQLScalarType;
  FeedItem?: FeedItemResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Playlist?: PlaylistResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Track?: TrackResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

