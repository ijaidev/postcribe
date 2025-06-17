// User Tweets
interface UserTweets {
    cursor: Cursor;
    result: Result;
}

interface Cursor {
    bottom: string;
    top: string;
}

interface Result {
    timeline: Timeline;
}

interface Timeline {
    instructions: Instruction[];
}

export type Instruction = TimelineClearCache | TimelineAddEntries;

interface TimelineClearCache {
    type: "TimelineClearCache";
}

interface TimelineAddEntries {
    type: "TimelineAddEntries";
    entries: Entry[];
}

interface Entry {
    entryId: string;
    sortIndex: string;
    content: EntryContent;
}

export interface EntryContent {
    entryType: "TimelineTimelineItem";
    __typename: "TimelineTimelineItem";
    itemContent: ItemContent;
    clientEventInfo: ClientEventInfo;
}

interface ItemContent {
    itemType: "TimelineTweet";
    __typename: "TimelineTweet";
    tweet_results: TweetResults;
    tweetDisplayType: "Tweet";
}

interface TweetResults {
    result: Tweet | TweetWithVisibilityResults;
}

interface Tweet {
    __typename: "Tweet";
    rest_id: string;
    core: Core;
    unmention_data: {};
    edit_control: EditControl;
    is_translatable: boolean;
    views: Views;
    source: string;
    legacy: LegacyTweet;
    quick_promote_eligibility: QuickPromoteEligibility;
}

interface TweetWithVisibilityResults {
    __typename: "TweetWithVisibilityResults";
    tweet: Tweet;
    community_results?: CommunityResults;
}

interface Core {
    user_results: UserResults;
}

interface UserResults {
    result: User;
}

interface User {
    __typename: "User";
    id: string;
    rest_id: string;
    affiliates_highlighted_label: {};
    has_graduated_access: boolean;
    is_blue_verified: boolean;
    profile_image_shape: "Circle";
    legacy: LegacyUser;
    professional?: Professional;
    tipjar_settings?: TipjarSettings;
    super_follow_eligible?: boolean;
}

interface LegacyUser {
    can_dm: boolean;
    can_media_tag: boolean;
    created_at: string;
    default_profile: boolean;
    default_profile_image: boolean;
    description: string;
    entities: UserEntities;
    fast_followers_count: number;
    favourites_count: number;
    followers_count: number;
    friends_count: number;
    has_custom_timelines: boolean;
    is_translator: boolean;
    listed_count: number;
    location: string;
    media_count: number;
    name: string;
    normal_followers_count: number;
    pinned_tweet_ids_str: string[];
    possibly_sensitive: boolean;
    profile_banner_url?: string;
    profile_image_url_https: string;
    profile_interstitial_type: string;
    screen_name: string;
    statuses_count: number;
    translator_type: "none";
    url?: string;
    verified: boolean;
    want_retweets: boolean;
    withheld_in_countries: any[];
}

interface UserEntities {
    description: {
        urls: UrlEntity[];
    };
    url?: {
        urls: UrlEntity[];
    };
}

interface UrlEntity {
    display_url: string;
    expanded_url: string;
    url: string;
    indices: [number, number];
}

interface Professional {
    rest_id: string;
    professional_type: "Creator";
    category: any[];
}

interface TipjarSettings {
    is_enabled: boolean;
    bitcoin_handle?: string;
    ethereum_handle?: string;
}

interface EditControl {
    edit_tweet_ids: string[];
    editable_until_msecs: string;
    is_edit_eligible: boolean;
    edits_remaining: string;
}

interface Views {
    count: string;
    state: "EnabledWithCount";
}

interface LegacyTweet {
    bookmark_count: number;
    bookmarked: boolean;
    created_at: string;
    conversation_id_str: string;
    display_text_range: [number, number];
    entities: TweetEntities;
    favorite_count: number;
    favorited: boolean;
    full_text: string;
    is_quote_status: boolean;
    lang: "en";
    quote_count: number;
    reply_count: number;
    retweet_count: number;
    retweeted: boolean;
    user_id_str: string;
    id_str: string;
}

interface TweetEntities {
    hashtags: any[];
    symbols: any[];
    timestamps: any[];
    urls: UrlEntity[];
    user_mentions: UserMention[];
}

interface UserMention {
    id_str: string;
    name: string;
    screen_name: string;
    indices: [number, number];
}

interface QuickPromoteEligibility {
    eligibility: "IneligibleNotProfessional";
}

interface ClientEventInfo {
    component: "tweet";
    element: "tweet";
    details: {
        timelinesDetails: TimelinesDetails;
    };
}

interface TimelinesDetails {
    injectionType: "RankedOrganicTweet";
    controllerData: string;
}

interface CommunityResults {
    result: Community;
}

interface Community {
    __typename: "Community";
    id_str: string;
    name: string;
    description: string;
    created_at: number;
    question: string;
    search_tags: string[];
    is_nsfw: boolean;
    primary_community_topic: CommunityTopic;
    actions: CommunityActions;
    admin_results: UserResults;
    creator_results: UserResults;
    invites_result: CommunityInvitesResult;
    join_policy: "Open";
    invites_policy: "MemberInvitesAllowed";
    is_pinned: boolean;
    members_facepile_results: UserResults[];
}

interface CommunityTopic {
    topic_id: string;
    topic_name: string;
}

interface CommunityActions {
    delete_action_result: CommunityActionUnavailable;
    join_action_result: { __typename: "CommunityJoinAction" };
    leave_action_result: CommunityActionUnavailable & { message: string };
    pin_action_result: { __typename: "CommunityTweetPinActionUnavailable" };
}

interface CommunityActionUnavailable {
    __typename: string; // e.g., "CommunityDeleteActionUnavailable", "CommunityLeaveActionUnavailable"
    reason: string;
}

interface CommunityInvitesResult {
    __typename: "CommunityInvitesUnavailable";
    reason: "Unavailable";
    message: string;
}

// User Info

interface UserInfoResponse {
    result: {
        data: UserInfo;
    };
}

interface UserInfo {
    user: {
        result: UserResult;
    };
}

interface UserResult {
    __typename: string;
    id: string;
    rest_id: string;
    affiliates_highlighted_label: {};
    has_graduated_access: boolean;
    is_blue_verified: boolean;
    profile_image_shape: string;
    legacy: Legacy;
    professional: Professional;
    super_follow_eligible: boolean;
    smart_blocked_by: boolean;
    smart_blocking: boolean;
    legacy_extended_profile: {};
    has_hidden_likes_on_profile: boolean;
    verification_info: VerificationInfo;
    highlights_info: HighlightsInfo;
    business_account: {};
    creator_subscriptions_count: number;
}

interface Legacy {
    can_dm: boolean;
    can_media_tag: boolean;
    created_at: string;
    default_profile: boolean;
    default_profile_image: boolean;
    description: string;
    entities: Entities;
    fast_followers_count: number;
    favourites_count: number;
    followers_count: number;
    friends_count: number;
    has_custom_timelines: boolean;
    is_translator: boolean;
    listed_count: number;
    location: string;
    media_count: number;
    name: string;
    normal_followers_count: number;
    pinned_tweet_ids_str: string[];
    possibly_sensitive: boolean;
    profile_banner_url: string;
    profile_image_url_https: string;
    profile_interstitial_type: string;
    screen_name: string;
    statuses_count: number;
    translator_type: string;
    url: string;
    verified: boolean;
    want_retweets: boolean;
    withheld_in_countries: any[];
}

interface Entities {
    description: {
        urls: any[];
    };
    url: {
        urls: URLEntity[];
    };
}

interface URLEntity {
    display_url: string;
    expanded_url: string;
    url: string;
    indices: number[];
}

interface Professional {
    rest_id: string;
    professional_type: "Creator";
    category: any[];
}

interface Category {
    id: number;
    name: string;
    icon_name: string;
}

interface VerificationInfo {
    reason: {
        description: VerificationDescription;
        verified_since_msec: string;
    };
}

interface VerificationDescription {
    text: string;
    entities: VerificationEntity[];
}

interface VerificationEntity {
    from_index: number;
    to_index: number;
    ref: {
        url: string;
        url_type: string;
    };
}

interface HighlightsInfo {
    can_highlight_tweets: boolean;
    highlighted_tweets: string;
}

// Clean tweet interface with all metrics and attachments
interface CleanTweet {
    id: string;
    text: string;
    created_at: string;
    metrics: {
        likes: number;
        retweets: number;
        replies: number;
        quotes: number;
        bookmarks: number;
        views: string;
    };
    mentions: Array<{
        id: string;
        name: string;
        username: string;
        indices: number[];
    }>;
}

export type {
    UserInfoResponse,
    UserTweets,
    CleanTweet,
    Tweet,
    TweetWithVisibilityResults,
};
