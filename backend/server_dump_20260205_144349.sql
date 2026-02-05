--
-- PostgreSQL database dump
--

\restrict 3iOYVCyFclAb2gUOUikL1QkDrqu0LQdeK1pjywmLnEpdsNVikr4PyBD6JiSnSVb

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.wordstat_searches DROP CONSTRAINT IF EXISTS wordstat_searches_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tracked_posts DROP CONSTRAINT IF EXISTS tracked_posts_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public.templates DROP CONSTRAINT IF EXISTS templates_creator_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_by_id_fkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public.parsing_state DROP CONSTRAINT IF EXISTS parsing_state_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_reply_to_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_chat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_message_id_fkey;
ALTER TABLE IF EXISTS ONLY public.logs DROP CONSTRAINT IF EXISTS logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.feeds DROP CONSTRAINT IF EXISTS feeds_source_id_fkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.content_plans DROP CONSTRAINT IF EXISTS content_plans_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.collections DROP CONSTRAINT IF EXISTS collections_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.chats DROP CONSTRAINT IF EXISTS chats_creator_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_chat_id_fkey;
ALTER TABLE IF EXISTS ONLY public.analytics DROP CONSTRAINT IF EXISTS analytics_source_id_fkey;
DROP INDEX IF EXISTS public.idx_wordstat_searches_source_id;
DROP INDEX IF EXISTS public.idx_wordstat_searches_query;
DROP INDEX IF EXISTS public.idx_wordstat_cache_key;
DROP INDEX IF EXISTS public.idx_wordstat_cache_expires;
DROP INDEX IF EXISTS public.idx_users_username;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_tracked_posts_source_id;
DROP INDEX IF EXISTS public.idx_templates_type;
DROP INDEX IF EXISTS public.idx_templates_creator_id;
DROP INDEX IF EXISTS public.idx_tasks_status;
DROP INDEX IF EXISTS public.idx_tasks_due_date;
DROP INDEX IF EXISTS public.idx_tasks_author_id;
DROP INDEX IF EXISTS public.idx_tasks_assigned_to;
DROP INDEX IF EXISTS public.idx_tasks_assigned_by_id;
DROP INDEX IF EXISTS public.idx_products_source_id;
DROP INDEX IF EXISTS public.idx_products_name;
DROP INDEX IF EXISTS public.idx_products_hidden;
DROP INDEX IF EXISTS public.idx_messages_is_system;
DROP INDEX IF EXISTS public.idx_messages_created_at;
DROP INDEX IF EXISTS public.idx_messages_chat_id;
DROP INDEX IF EXISTS public.idx_messages_author_id;
DROP INDEX IF EXISTS public.idx_message_reactions_message_id;
DROP INDEX IF EXISTS public.idx_logs_user_id;
DROP INDEX IF EXISTS public.idx_logs_entity;
DROP INDEX IF EXISTS public.idx_logs_created_at;
DROP INDEX IF EXISTS public.idx_links_list_id;
DROP INDEX IF EXISTS public.idx_links_department;
DROP INDEX IF EXISTS public.idx_links_bookmarked;
DROP INDEX IF EXISTS public.idx_link_lists_department;
DROP INDEX IF EXISTS public.idx_feeds_source_id;
DROP INDEX IF EXISTS public.idx_feeds_slug;
DROP INDEX IF EXISTS public.idx_events_user_id;
DROP INDEX IF EXISTS public.idx_events_start_date;
DROP INDEX IF EXISTS public.idx_data_sources_type;
DROP INDEX IF EXISTS public.idx_content_plans_status;
DROP INDEX IF EXISTS public.idx_content_plans_scheduled_date;
DROP INDEX IF EXISTS public.idx_content_plans_author_id;
DROP INDEX IF EXISTS public.idx_chats_is_system;
DROP INDEX IF EXISTS public.idx_chats_is_group;
DROP INDEX IF EXISTS public.idx_chats_creator_id;
DROP INDEX IF EXISTS public.idx_chat_participants_user_id;
DROP INDEX IF EXISTS public.idx_chat_participants_chat_id;
DROP INDEX IF EXISTS public.idx_analytics_source_id;
DROP INDEX IF EXISTS public.idx_analytics_created_at;
ALTER TABLE IF EXISTS ONLY public.wordstat_searches DROP CONSTRAINT IF EXISTS wordstat_searches_pkey;
ALTER TABLE IF EXISTS ONLY public.wordstat_cache DROP CONSTRAINT IF EXISTS wordstat_cache_pkey;
ALTER TABLE IF EXISTS ONLY public.wordstat_cache DROP CONSTRAINT IF EXISTS wordstat_cache_cache_key_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.tracked_posts DROP CONSTRAINT IF EXISTS tracked_posts_pkey;
ALTER TABLE IF EXISTS ONLY public.todo_lists DROP CONSTRAINT IF EXISTS todo_lists_pkey;
ALTER TABLE IF EXISTS ONLY public.todo_categories DROP CONSTRAINT IF EXISTS todo_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.templates DROP CONSTRAINT IF EXISTS templates_pkey;
ALTER TABLE IF EXISTS ONLY public.tasks DROP CONSTRAINT IF EXISTS tasks_pkey;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_key_key;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.parsing_state DROP CONSTRAINT IF EXISTS parsing_state_source_id_key;
ALTER TABLE IF EXISTS ONLY public.parsing_state DROP CONSTRAINT IF EXISTS parsing_state_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_pkey;
ALTER TABLE IF EXISTS ONLY public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_message_id_user_id_reaction_key;
ALTER TABLE IF EXISTS ONLY public.logs DROP CONSTRAINT IF EXISTS logs_pkey;
ALTER TABLE IF EXISTS ONLY public.links DROP CONSTRAINT IF EXISTS links_pkey;
ALTER TABLE IF EXISTS ONLY public.link_lists DROP CONSTRAINT IF EXISTS link_lists_pkey;
ALTER TABLE IF EXISTS ONLY public.feeds DROP CONSTRAINT IF EXISTS feeds_slug_key;
ALTER TABLE IF EXISTS ONLY public.feeds DROP CONSTRAINT IF EXISTS feeds_pkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_pkey;
ALTER TABLE IF EXISTS ONLY public.data_sources DROP CONSTRAINT IF EXISTS data_sources_pkey;
ALTER TABLE IF EXISTS ONLY public.content_plans DROP CONSTRAINT IF EXISTS content_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.collections DROP CONSTRAINT IF EXISTS collections_pkey;
ALTER TABLE IF EXISTS ONLY public.chats DROP CONSTRAINT IF EXISTS chats_pkey;
ALTER TABLE IF EXISTS ONLY public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_pkey;
ALTER TABLE IF EXISTS ONLY public.chat_participants DROP CONSTRAINT IF EXISTS chat_participants_chat_id_user_id_key;
ALTER TABLE IF EXISTS ONLY public.analytics DROP CONSTRAINT IF EXISTS analytics_pkey;
ALTER TABLE IF EXISTS public.wordstat_searches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.wordstat_cache ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.parsing_state ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.message_reactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.chat_participants ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.analytics ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.wordstat_searches_id_seq;
DROP TABLE IF EXISTS public.wordstat_searches;
DROP SEQUENCE IF EXISTS public.wordstat_cache_id_seq;
DROP TABLE IF EXISTS public.wordstat_cache;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.tracked_posts;
DROP TABLE IF EXISTS public.todo_lists;
DROP TABLE IF EXISTS public.todo_categories;
DROP TABLE IF EXISTS public.templates;
DROP TABLE IF EXISTS public.tasks;
DROP SEQUENCE IF EXISTS public.settings_id_seq;
DROP TABLE IF EXISTS public.settings;
DROP TABLE IF EXISTS public.products;
DROP SEQUENCE IF EXISTS public.parsing_state_id_seq;
DROP TABLE IF EXISTS public.parsing_state;
DROP TABLE IF EXISTS public.messages;
DROP SEQUENCE IF EXISTS public.message_reactions_id_seq;
DROP TABLE IF EXISTS public.message_reactions;
DROP SEQUENCE IF EXISTS public.logs_id_seq;
DROP TABLE IF EXISTS public.logs;
DROP TABLE IF EXISTS public.links;
DROP TABLE IF EXISTS public.link_lists;
DROP TABLE IF EXISTS public.feeds;
DROP TABLE IF EXISTS public.events;
DROP TABLE IF EXISTS public.data_sources;
DROP TABLE IF EXISTS public.content_plans;
DROP TABLE IF EXISTS public.collections;
DROP TABLE IF EXISTS public.chats;
DROP SEQUENCE IF EXISTS public.chat_participants_id_seq;
DROP TABLE IF EXISTS public.chat_participants;
DROP SEQUENCE IF EXISTS public.analytics_id_seq;
DROP TABLE IF EXISTS public.analytics;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analytics (
    id integer NOT NULL,
    source_id character varying(255),
    metric_name character varying(255),
    metric_value numeric(15,2),
    data_point jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.analytics OWNER TO postgres;

--
-- Name: analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.analytics_id_seq OWNER TO postgres;

--
-- Name: analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.analytics_id_seq OWNED BY public.analytics.id;


--
-- Name: chat_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_participants (
    id integer NOT NULL,
    chat_id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.chat_participants OWNER TO postgres;

--
-- Name: chat_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_participants_id_seq OWNER TO postgres;

--
-- Name: chat_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_participants_id_seq OWNED BY public.chat_participants.id;


--
-- Name: chats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chats (
    id character varying(255) NOT NULL,
    title character varying(255),
    is_group boolean DEFAULT false,
    is_notifications_chat boolean DEFAULT false,
    is_system_chat boolean DEFAULT false,
    is_favorites_chat boolean DEFAULT false,
    creator_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    unread_count integer DEFAULT 0,
    read_messages_by_user jsonb DEFAULT '{}'::jsonb,
    pinned_by_user jsonb DEFAULT '{}'::jsonb,
    last_message_id character varying(255)
);


ALTER TABLE public.chats OWNER TO postgres;

--
-- Name: collections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.collections (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    product_ids jsonb DEFAULT '[]'::jsonb,
    created_by character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.collections OWNER TO postgres;

--
-- Name: content_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_plans (
    id character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    content text,
    status character varying(50) DEFAULT 'draft'::character varying,
    post_type character varying(100),
    scheduled_date timestamp without time zone,
    published_date timestamp without time zone,
    platform character varying(100),
    tags jsonb DEFAULT '[]'::jsonb,
    author_id character varying(255),
    assigned_to_ids jsonb DEFAULT '[]'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.content_plans OWNER TO postgres;

--
-- Name: data_sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_sources (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    url text,
    source_type character varying(100),
    enabled boolean DEFAULT true,
    auto_sync boolean DEFAULT false,
    sync_interval integer DEFAULT 3600,
    is_parsing boolean DEFAULT false,
    last_sync timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.data_sources OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    user_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: feeds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feeds (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255),
    description text,
    source_id character varying(255),
    template_type character varying(100),
    enabled boolean DEFAULT true,
    last_update timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.feeds OWNER TO postgres;

--
-- Name: link_lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.link_lists (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    color character varying(50) DEFAULT '#3b82f6'::character varying,
    icon character varying(255),
    department character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    list_order integer DEFAULT 0
);


ALTER TABLE public.link_lists OWNER TO postgres;

--
-- Name: links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.links (
    id character varying(255) NOT NULL,
    url text NOT NULL,
    title character varying(255),
    description text,
    favicon text,
    image text,
    site_name character varying(255),
    list_id character varying(100),
    tags jsonb DEFAULT '[]'::jsonb,
    department character varying(255),
    is_bookmarked boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    click_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    link_order integer DEFAULT 0
);


ALTER TABLE public.links OWNER TO postgres;

--
-- Name: logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.logs (
    id integer NOT NULL,
    user_id character varying(255),
    action character varying(255),
    entity_type character varying(100),
    entity_id character varying(255),
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.logs OWNER TO postgres;

--
-- Name: logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logs_id_seq OWNER TO postgres;

--
-- Name: logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.logs_id_seq OWNED BY public.logs.id;


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_reactions (
    id integer NOT NULL,
    message_id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    reaction character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.message_reactions OWNER TO postgres;

--
-- Name: message_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.message_reactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_reactions_id_seq OWNER TO postgres;

--
-- Name: message_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.message_reactions_id_seq OWNED BY public.message_reactions.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id character varying(255) NOT NULL,
    chat_id character varying(255) NOT NULL,
    author_id character varying(255) NOT NULL,
    author_name character varying(255),
    content text,
    mentions jsonb DEFAULT '[]'::jsonb,
    reply_to_id character varying(255),
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    is_system_message boolean DEFAULT false,
    notification_type character varying(100),
    linked_chat_id character varying(255),
    linked_message_id character varying(255),
    linked_task_id character varying(255),
    linked_post_id character varying(255),
    attachments jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: parsing_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parsing_state (
    id integer NOT NULL,
    source_id character varying(255) NOT NULL,
    status character varying(50),
    progress integer,
    started_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    details jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.parsing_state OWNER TO postgres;

--
-- Name: parsing_state_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parsing_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parsing_state_id_seq OWNER TO postgres;

--
-- Name: parsing_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parsing_state_id_seq OWNED BY public.parsing_state.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id character varying(255) NOT NULL,
    source_id character varying(255),
    name character varying(255) NOT NULL,
    description text,
    price numeric(10,2),
    currency character varying(10),
    url text,
    image_url text,
    is_new boolean DEFAULT false,
    hidden boolean DEFAULT false,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    hidden_at timestamp without time zone,
    dates_updated_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    dates jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key character varying(255) NOT NULL,
    value jsonb,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.settings_id_seq OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'pending'::character varying,
    priority character varying(50),
    due_date timestamp without time zone,
    assigned_to character varying(255),
    assigned_to_ids jsonb DEFAULT '[]'::jsonb,
    author_id character varying(255),
    assigned_by_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.templates (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    template_type character varying(100),
    content text,
    variables jsonb DEFAULT '{}'::jsonb,
    is_system boolean DEFAULT false,
    creator_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.templates OWNER TO postgres;

--
-- Name: todo_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.todo_categories (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    color character varying(50) DEFAULT '#3b82f6'::character varying,
    icon character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category_order integer DEFAULT 0
);


ALTER TABLE public.todo_categories OWNER TO postgres;

--
-- Name: todo_lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.todo_lists (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    color character varying(50) DEFAULT '#3b82f6'::character varying,
    icon character varying(255),
    department character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    list_order integer DEFAULT 0
);


ALTER TABLE public.todo_lists OWNER TO postgres;

--
-- Name: tracked_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tracked_posts (
    id character varying(255) NOT NULL,
    post_url text,
    title character varying(255),
    utm_params jsonb,
    source_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tracked_posts OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'user'::character varying,
    todo_role character varying(50) DEFAULT 'universal'::character varying,
    "position" character varying(255),
    department character varying(255),
    phone character varying(20),
    work_schedule text,
    telegram_id character varying(255),
    telegram_username character varying(255),
    is_department_head boolean DEFAULT false,
    is_active boolean DEFAULT true,
    enabled_tools jsonb DEFAULT '[]'::jsonb,
    can_see_all_tasks boolean DEFAULT false,
    avatar character varying(255),
    is_online boolean DEFAULT false,
    last_seen timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: wordstat_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wordstat_cache (
    id integer NOT NULL,
    cache_key character varying(255) NOT NULL,
    cache_data jsonb,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wordstat_cache OWNER TO postgres;

--
-- Name: wordstat_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wordstat_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wordstat_cache_id_seq OWNER TO postgres;

--
-- Name: wordstat_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wordstat_cache_id_seq OWNED BY public.wordstat_cache.id;


--
-- Name: wordstat_searches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wordstat_searches (
    id integer NOT NULL,
    query character varying(255) NOT NULL,
    search_volume integer,
    competition numeric(5,2),
    source_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wordstat_searches OWNER TO postgres;

--
-- Name: wordstat_searches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wordstat_searches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wordstat_searches_id_seq OWNER TO postgres;

--
-- Name: wordstat_searches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wordstat_searches_id_seq OWNED BY public.wordstat_searches.id;


--
-- Name: analytics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics ALTER COLUMN id SET DEFAULT nextval('public.analytics_id_seq'::regclass);


--
-- Name: chat_participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants ALTER COLUMN id SET DEFAULT nextval('public.chat_participants_id_seq'::regclass);


--
-- Name: logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs ALTER COLUMN id SET DEFAULT nextval('public.logs_id_seq'::regclass);


--
-- Name: message_reactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions ALTER COLUMN id SET DEFAULT nextval('public.message_reactions_id_seq'::regclass);


--
-- Name: parsing_state id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parsing_state ALTER COLUMN id SET DEFAULT nextval('public.parsing_state_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: wordstat_cache id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wordstat_cache ALTER COLUMN id SET DEFAULT nextval('public.wordstat_cache_id_seq'::regclass);


--
-- Name: wordstat_searches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wordstat_searches ALTER COLUMN id SET DEFAULT nextval('public.wordstat_searches_id_seq'::regclass);


--
-- Data for Name: analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analytics (id, source_id, metric_name, metric_value, data_point, created_at) FROM stdin;
\.


--
-- Data for Name: chat_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_participants (id, chat_id, user_id, joined_at) FROM stdin;
1	notifications-user_001	user_001	2026-02-03 19:10:45.650178
2	favorites_user_001	user_001	2026-02-03 19:10:45.756196
3	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	2026-02-03 19:10:45.761451
4	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_003	2026-02-03 19:10:57.496033
5	2d3a8a19-2176-4ab5-9302-1e5adf30a019	user_001	2026-02-03 19:16:46.057625
6	2d3a8a19-2176-4ab5-9302-1e5adf30a019	user_1770028756.56826	2026-02-03 19:24:59.896415
7	notifications-user_002	user_002	2026-02-03 20:57:55.620408
8	favorites_user_002	user_002	2026-02-04 12:36:40.410529
9	6ef3f821-ce5d-40d1-9e57-c61ece5fedc3	user_002	2026-02-04 12:49:52.672113
10	6ef3f821-ce5d-40d1-9e57-c61ece5fedc3	user_003	2026-02-04 15:05:10.990884
11	6ef3f821-ce5d-40d1-9e57-c61ece5fedc3	user_1769519484.436588	2026-02-04 15:05:10.992381
12	6ef3f821-ce5d-40d1-9e57-c61ece5fedc3	user_001	2026-02-04 15:05:10.993704
13	notifications-user_003	user_003	2026-02-04 15:05:11.024106
14	favorites_user_003	user_003	2026-02-04 15:26:01.816798
\.


--
-- Data for Name: chats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chats (id, title, is_group, is_notifications_chat, is_system_chat, is_favorites_chat, creator_id, created_at, updated_at, unread_count, read_messages_by_user, pinned_by_user, last_message_id) FROM stdin;
notifications-user_001	Уведомления	f	t	t	f	user_001	2026-02-03 19:10:45.650178	2026-02-03 19:10:45.650178	0	{}	{}	\N
favorites_user_001	Избранное	f	f	t	t	user_001	2026-02-03 19:10:45.756196	2026-02-03 19:10:45.756196	0	{}	{}	\N
favorites_user_002	Избранное	f	f	t	t	user_002	2026-02-04 12:36:40.410529	2026-02-04 12:36:40.410529	0	{}	{}	\N
2d3a8a19-2176-4ab5-9302-1e5adf30a019	\N	f	f	f	f	\N	2026-02-03 19:16:46.057625	2026-02-03 19:16:46.057625	0	{}	{}	\N
09470bdb-71e0-4826-a2ab-cb1fc973c3ba	\N	f	f	f	f	\N	2026-02-03 19:10:45.761451	2026-02-03 19:10:45.761451	0	{"user_001": "2026-02-04T15:05:08.553623"}	{}	\N
notifications-user_002	Уведомления	f	t	t	f	user_002	2026-02-03 20:57:55.620408	2026-02-03 20:57:55.620408	0	{}	{"user_002": true}	\N
6ef3f821-ce5d-40d1-9e57-c61ece5fedc3	Отдел маркетинга	t	f	f	f	user_001	2026-02-04 12:49:52.672113	2026-02-04 12:49:52.672113	0	{"user_001": "2026-02-04T15:25:33.729255"}	{}	\N
notifications-user_003	Уведомления	f	t	t	f	user_003	2026-02-04 15:05:11.024106	2026-02-04 15:05:11.024106	0	{}	{}	\N
favorites_user_003	Избранное	f	f	t	t	user_003	2026-02-04 15:26:01.816798	2026-02-04 15:26:01.816798	0	{}	{}	\N
\.


--
-- Data for Name: collections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.collections (id, name, description, product_ids, created_by, created_at, updated_at, metadata) FROM stdin;
\.


--
-- Data for Name: content_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.content_plans (id, title, description, content, status, post_type, scheduled_date, published_date, platform, tags, author_id, assigned_to_ids, attachments, created_at, updated_at, metadata) FROM stdin;
\.


--
-- Data for Name: data_sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_sources (id, name, url, source_type, enabled, auto_sync, sync_interval, is_parsing, last_sync, created_at, updated_at, metadata) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, title, description, start_date, end_date, user_id, created_at, updated_at, metadata) FROM stdin;
\.


--
-- Data for Name: feeds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feeds (id, name, slug, description, source_id, template_type, enabled, last_update, created_at, updated_at, metadata) FROM stdin;
\.


--
-- Data for Name: link_lists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.link_lists (id, name, color, icon, department, created_at, updated_at, list_order) FROM stdin;
\.


--
-- Data for Name: links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.links (id, url, title, description, favicon, image, site_name, list_id, tags, department, is_bookmarked, is_pinned, click_count, created_at, updated_at, link_order) FROM stdin;
20260114_122650_i1dqxg	https://vs-travel.ru/	Турфирма Вокруг света - экскурсионные туры по России. Официальный сайт	Поиск, подбор, бронирование туров по всем направлениям России. Экскурсии на 1 день, автобусные и ж/д туры.	https://www.google.com/s2/favicons?domain=vs-travel.ru&sz=64	https://vs-travel.ru/assets/i/logo.svg	vs-travel.ru	work	[]	\N	t	f	0	2026-01-14 12:26:50.738	2026-01-28 13:47:45.453	0
20260202_143315_npu3qn	https://chat.deepseek.com/	DeepSeek	Chat with DeepSeek AI.	https://www.google.com/s2/favicons?domain=chat.deepseek.com&sz=64	https://cdn.deepseek.com/images/deepseek-chat-open-graph-image.jpeg	chat.deepseek.com	work	[]	\N	f	f	0	2026-02-02 14:33:15.943	2026-02-02 14:33:47.939	1
20260202_144022_9nscte	https://miro.com/app/board/uXjVGIo2luY=/?share_link_id=711359141571	Схема звонков	\N	https://www.google.com/s2/favicons?domain=miro.com&sz=64	https://miro.com/api/v1/boards/uXjVGIo2luY=/picture?etag=R3458764517606860676_0_20250610	miro.com	work	[]	\N	f	f	0	2026-02-02 14:40:22.276	2026-02-02 14:40:45.375	2
20260202_144112_j1hlox	https://miro.com/app/board/uXjVJ7hl8pE=/?share_link_id=73760338316	Триггеры	\N	https://www.google.com/s2/favicons?domain=miro.com&sz=64	https://miro.com/api/v1/boards/uXjVJ7hl8pE=/picture?etag=R3458764517264295811_0_20250610	miro.com	work	[]	\N	f	f	0	2026-02-02 14:41:12.542	2026-02-02 14:41:19.758	3
20260203_120103_770co0	https://gemini.google.com	‎Google Gemini	Meet Gemini, Google’s AI assistant. Get help with writing, planning, brainstorming, and more. Experience the power of generative AI.	https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64	https://www.gstatic.com/lamda/images/gemini_aurora_thumbnail_4g_e74822ff0ca4259beb718.png	Gemini	work	[]	\N	f	f	0	2026-02-03 12:01:03.33	2026-02-03 12:01:03.33	4
\.


--
-- Data for Name: logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.logs (id, user_id, action, entity_type, entity_id, details, created_at) FROM stdin;
\.


--
-- Data for Name: message_reactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_reactions (id, message_id, user_id, reaction, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, chat_id, author_id, author_name, content, mentions, reply_to_id, is_edited, is_deleted, is_system_message, notification_type, linked_chat_id, linked_message_id, linked_task_id, linked_post_id, attachments, metadata, created_at, updated_at) FROM stdin;
4a246538-a7b4-46b4-b021-049cd6123d27	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	Антон Николюк	111	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-03 19:16:46.057625	2026-02-03 19:16:46.057625
9345f03f-149b-4457-a4d1-800375aea0e7	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	Антон Николюк	йййй	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-03 19:16:46.057625	2026-02-03 19:16:46.057625
d7d76431-d951-46ee-b83c-27038dae7a28	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	Антон Николюк	111111111111111111111111111111111111	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-03 19:16:46.057625	2026-02-03 19:16:46.057625
e322623c-9e2e-4eb0-8bc5-5f3bbfc7ff2c	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	Антон Николюк	111111111111111111111111111111111	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-03 19:16:46.057625	2026-02-03 19:16:46.057625
feeff6aa-d33c-494f-9105-90810e6dc397	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	Антон Николюк	11111111111111111111	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-03 19:16:46.057625	2026-02-03 19:16:46.057625
b8dca2df-aecc-4b64-b01a-7b38727c5356	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	Антон Николюк	1111	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-03 19:16:46.057625	2026-02-03 19:16:46.057625
85543e17-5328-4e19-baed-3742d70de82a	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	Антон Николюк	Тест 	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-03 19:16:46.057625	2026-02-03 19:16:46.057625
741efa7a-6947-4783-b66f-bdd5348410d5	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	Антон Николюк	😅	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-03 20:57:55.620408	2026-02-03 20:57:55.620408
bcb313d7-31fa-44eb-97c5-de80d201853d	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	Антон Николюк	💣	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-03 20:57:55.620408	2026-02-03 20:57:55.620408
5588e481-ee4b-4982-80d6-b9828ab9275d	09470bdb-71e0-4826-a2ab-cb1fc973c3ba	user_001	Антон Николюк	😝	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-03 20:57:55.620408	2026-02-03 20:57:55.620408
aa796073-a474-4536-a67b-55fd897d6fe8	6ef3f821-ce5d-40d1-9e57-c61ece5fedc3	user_001	Антон Николюк	Тест	[]	\N	f	f	f	\N	\N	\N	\N	\N	[]	{}	2026-02-04 15:05:11.024106	2026-02-04 15:05:11.024106
\.


--
-- Data for Name: parsing_state; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parsing_state (id, source_id, status, progress, started_at, updated_at, details) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, source_id, name, description, price, currency, url, image_url, is_new, hidden, added_at, updated_at, hidden_at, dates_updated_at, metadata, dates) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, title, description, status, priority, due_date, assigned_to, assigned_to_ids, author_id, assigned_by_id, created_at, updated_at, metadata) FROM stdin;
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.templates (id, name, template_type, content, variables, is_system, creator_id, created_at, updated_at, metadata) FROM stdin;
\.


--
-- Data for Name: todo_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.todo_categories (id, name, color, icon, created_at, updated_at, category_order) FROM stdin;
\.


--
-- Data for Name: todo_lists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.todo_lists (id, name, color, icon, department, created_at, updated_at, list_order) FROM stdin;
\.


--
-- Data for Name: tracked_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tracked_posts (id, post_url, title, utm_params, source_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, username, email, password, role, todo_role, "position", department, phone, work_schedule, telegram_id, telegram_username, is_department_head, is_active, enabled_tools, can_see_all_tasks, avatar, is_online, last_seen, created_at, updated_at) FROM stdin;
user_003	Анна Николюк	smm	smm@vs-travel.ru	vstraveltourmsk1995yearVS!	user	universal	SMM	Отдел маркетинга	\N	\N	\N	\N	f	t	["utm-generator", "content-plan", "transliterator"]	f	\N	f	2026-02-02 11:53:28.524	\N	2026-02-03 19:10:00.369071
user_004	Татьяна Николюк	director	director@vs-travel.ru	vstravel995year1995	user	universal	Генеральный директор	Руководство	\N	\N	\N	\N	f	t	[]	f	\N	f	2026-02-03 06:01:33.319	\N	2026-02-03 19:10:00.369071
user_005	Роман Гойдин	romang_07	r.goydin@vs.travel	vstravel995year1995	admin	universal	Директор по ИТ	Руководство	\N	\N	\N	\N	f	t	["feed-editor", "transliterator", "slovolov-pro", "slovolov", "content-plan", "utm-generator"]	f	\N	t	2026-02-03 06:25:39.95	\N	2026-02-03 19:10:00.369071
user_1769519484.436588	Ольга Яковлева	iakovleva	iakovleva@vs-travel.ru	vstravel995year1995	user	universal	Контент менеджер	Отдел маркетинга	\N	\N	\N	\N	f	t	["utm-generator", "content-plan", "transliterator"]	f	\N	f	2026-02-03 14:32:17.535	2026-01-27 16:11:24.436989	2026-02-03 19:10:00.369071
user_1770027540.046597	Екатерина Давыдова	davydova	davydova@vs-travel.ru	vstravel995!	user	universal	Руководитель отдела продаж	Отдел продаж	\N	\N	\N	\N	f	t	["transliterator", "utm-generator"]	f	\N	f	\N	2026-02-02 13:19:00.048447	2026-02-03 19:10:00.369071
user_1770027611.524557	Виктория Севостьянова	sevostyanova	sevostyanova@vs-travel.ru	vstravel995!	user	universal	Менеджер	Отдел продаж	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:20:11.525935	2026-02-03 19:10:00.369071
user_1770028756.56826	Анастасия Пермякова	permyakova	permyakova@vs-travel.ru	vstravel995!	user	universal	Product менеджер	Отдел продукта	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:39:16.570812	2026-02-03 19:10:00.369071
user_1770028876.547975	Инесса Рубцова	rubcova	rubcova@vs-travel.ru	vstravel995!	user	universal	Product менеджер	Отдел продукта	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:41:16.549547	2026-02-03 19:10:00.369071
user_1770028935.609122	Светлана Наумова	bondar	bondar@vs-travel.ru	vstravel995!	user	universal	Product менеджер	Отдел продукта	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:42:15.610861	2026-02-03 19:10:00.369071
user_1770029014.660771	Андрей Тарудько	control	control@vs-travel.ru	vstravel995!	user	universal	Руководитель юридического отдела	Юридический отдел	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:43:34.663112	2026-02-03 19:10:00.369071
user_1770029079.932462	Светлана Соколова	dogovor	dogovor@vs-travel.ru	vstravel995!	user	universal	Юрист	Юридический отдел	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:44:39.934009	2026-02-03 19:10:00.369071
user_1770029214.185058	Евгения Антонинова	antoninova	antoninova@vs-travel.ru	vstravel995!	user	universal	Руководитель агентского отдела	Агентский отдел	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:46:54.186588	2026-02-03 19:10:00.369071
user_1770029301.326726	Татьяна Бабина	babina	babina@vs-travel.ru	vstravel995!	user	universal	Менеджер	Агентский отдел	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:48:21.328801	2026-02-03 19:10:00.369071
user_1770029363.85299	Елена Фирсанова	firsanova	firsanova@vs-travel.ru	vstravel995year1995	user	universal	Менеджер	ЖД отдел	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:49:23.854845	2026-02-03 19:10:00.369071
user_1770029441.216541	Ирина Захарова	zakharova	zakharova@vs-travel.ru	vstravel995year1995	user	universal	Менеджер	ЖД отдел	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:50:41.218031	2026-02-03 19:10:00.369071
user_1770029539.899811	Ирина Очкасова	ochkasova	ochkasova@vs-travel.ru	vstravel995year1995	user	universal	Менеджер	ТА Отдел	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:52:19.900941	2026-02-03 19:10:00.369071
user_1770029601.127973	Наталья Савельева	savelyeva	savelyeva@vs-travel.ru	vstravel995year1995	user	universal	Менеджер	ТА Отдел	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:53:21.129772	2026-02-03 19:10:00.369071
user_1770029718.977198	Ольга Авданина	avdanina	avdanina@vs-travel.ru	vstravel995year1995	user	executor	Бухгалтер	Бухгалтерия	\N	\N	\N	\N	f	t	[]	f	\N	f	\N	2026-02-02 13:55:18.978839	2026-02-03 19:10:00.369071
user_002	Ирина Телегина	It_ira	telegina@vs-travel.ru	vstraveltourmsk1995yearVS!	user	universal	Директор по маркетингу	Отдел маркетинга	\N	\N	\N	\N	f	t	["feed-editor", "transliterator", "slovolov", "slovolov-pro", "utm-generator", "content-plan"]	f	\N	t	2026-02-04 09:51:48.382	\N	2026-02-04 12:49:52.672113
user_001	Антон Николюк	admin	a.nikolyuk@vs-travel.ru	vstraveltourmsk1995yearVS!	admin	universal	Маркетолог аналитик	Отдел маркетинга	+7 (999) 968-19-90	пн-пт, 10:00-19:00, ср/пт - удаленно. 	\N	\N	f	t	["feed-editor", "transliterator", "slovolov", "slovolov-pro", "utm-generator", "content-plan"]	f	\N	t	2026-02-04 12:25:44.856	\N	2026-02-04 15:05:11.024106
\.


--
-- Data for Name: wordstat_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wordstat_cache (id, cache_key, cache_data, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: wordstat_searches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wordstat_searches (id, query, search_volume, competition, source_id, created_at, updated_at) FROM stdin;
\.


--
-- Name: analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.analytics_id_seq', 1, false);


--
-- Name: chat_participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chat_participants_id_seq', 14, true);


--
-- Name: logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.logs_id_seq', 1, false);


--
-- Name: message_reactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.message_reactions_id_seq', 1, false);


--
-- Name: parsing_state_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parsing_state_id_seq', 1, false);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.settings_id_seq', 1, false);


--
-- Name: wordstat_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wordstat_cache_id_seq', 1, false);


--
-- Name: wordstat_searches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wordstat_searches_id_seq', 1, false);


--
-- Name: analytics analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);


--
-- Name: chat_participants chat_participants_chat_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_chat_id_user_id_key UNIQUE (chat_id, user_id);


--
-- Name: chat_participants chat_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: content_plans content_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_plans
    ADD CONSTRAINT content_plans_pkey PRIMARY KEY (id);


--
-- Name: data_sources data_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_sources
    ADD CONSTRAINT data_sources_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: feeds feeds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feeds
    ADD CONSTRAINT feeds_pkey PRIMARY KEY (id);


--
-- Name: feeds feeds_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feeds
    ADD CONSTRAINT feeds_slug_key UNIQUE (slug);


--
-- Name: link_lists link_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_lists
    ADD CONSTRAINT link_lists_pkey PRIMARY KEY (id);


--
-- Name: links links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.links
    ADD CONSTRAINT links_pkey PRIMARY KEY (id);


--
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_message_id_user_id_reaction_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_user_id_reaction_key UNIQUE (message_id, user_id, reaction);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: parsing_state parsing_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parsing_state
    ADD CONSTRAINT parsing_state_pkey PRIMARY KEY (id);


--
-- Name: parsing_state parsing_state_source_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parsing_state
    ADD CONSTRAINT parsing_state_source_id_key UNIQUE (source_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: todo_categories todo_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todo_categories
    ADD CONSTRAINT todo_categories_pkey PRIMARY KEY (id);


--
-- Name: todo_lists todo_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.todo_lists
    ADD CONSTRAINT todo_lists_pkey PRIMARY KEY (id);


--
-- Name: tracked_posts tracked_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracked_posts
    ADD CONSTRAINT tracked_posts_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: wordstat_cache wordstat_cache_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wordstat_cache
    ADD CONSTRAINT wordstat_cache_cache_key_key UNIQUE (cache_key);


--
-- Name: wordstat_cache wordstat_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wordstat_cache
    ADD CONSTRAINT wordstat_cache_pkey PRIMARY KEY (id);


--
-- Name: wordstat_searches wordstat_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wordstat_searches
    ADD CONSTRAINT wordstat_searches_pkey PRIMARY KEY (id);


--
-- Name: idx_analytics_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analytics_created_at ON public.analytics USING btree (created_at);


--
-- Name: idx_analytics_source_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_analytics_source_id ON public.analytics USING btree (source_id);


--
-- Name: idx_chat_participants_chat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants USING btree (chat_id);


--
-- Name: idx_chat_participants_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_participants_user_id ON public.chat_participants USING btree (user_id);


--
-- Name: idx_chats_creator_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chats_creator_id ON public.chats USING btree (creator_id);


--
-- Name: idx_chats_is_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chats_is_group ON public.chats USING btree (is_group);


--
-- Name: idx_chats_is_system; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chats_is_system ON public.chats USING btree (is_system_chat);


--
-- Name: idx_content_plans_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_plans_author_id ON public.content_plans USING btree (author_id);


--
-- Name: idx_content_plans_scheduled_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_plans_scheduled_date ON public.content_plans USING btree (scheduled_date);


--
-- Name: idx_content_plans_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_content_plans_status ON public.content_plans USING btree (status);


--
-- Name: idx_data_sources_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_sources_type ON public.data_sources USING btree (source_type);


--
-- Name: idx_events_start_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_start_date ON public.events USING btree (start_date);


--
-- Name: idx_events_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_user_id ON public.events USING btree (user_id);


--
-- Name: idx_feeds_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feeds_slug ON public.feeds USING btree (slug);


--
-- Name: idx_feeds_source_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feeds_source_id ON public.feeds USING btree (source_id);


--
-- Name: idx_link_lists_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_link_lists_department ON public.link_lists USING btree (department);


--
-- Name: idx_links_bookmarked; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_links_bookmarked ON public.links USING btree (is_bookmarked);


--
-- Name: idx_links_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_links_department ON public.links USING btree (department);


--
-- Name: idx_links_list_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_links_list_id ON public.links USING btree (list_id);


--
-- Name: idx_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_created_at ON public.logs USING btree (created_at);


--
-- Name: idx_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_entity ON public.logs USING btree (entity_type, entity_id);


--
-- Name: idx_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_logs_user_id ON public.logs USING btree (user_id);


--
-- Name: idx_message_reactions_message_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_message_reactions_message_id ON public.message_reactions USING btree (message_id);


--
-- Name: idx_messages_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_author_id ON public.messages USING btree (author_id);


--
-- Name: idx_messages_chat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_chat_id ON public.messages USING btree (chat_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at);


--
-- Name: idx_messages_is_system; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_is_system ON public.messages USING btree (is_system_message);


--
-- Name: idx_products_hidden; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_hidden ON public.products USING btree (hidden);


--
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_name ON public.products USING btree (name);


--
-- Name: idx_products_source_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_source_id ON public.products USING btree (source_id);


--
-- Name: idx_tasks_assigned_by_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_assigned_by_id ON public.tasks USING btree (assigned_by_id);


--
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);


--
-- Name: idx_tasks_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_author_id ON public.tasks USING btree (author_id);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_templates_creator_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_templates_creator_id ON public.templates USING btree (creator_id);


--
-- Name: idx_templates_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_templates_type ON public.templates USING btree (template_type);


--
-- Name: idx_tracked_posts_source_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tracked_posts_source_id ON public.tracked_posts USING btree (source_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_wordstat_cache_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wordstat_cache_expires ON public.wordstat_cache USING btree (expires_at);


--
-- Name: idx_wordstat_cache_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wordstat_cache_key ON public.wordstat_cache USING btree (cache_key);


--
-- Name: idx_wordstat_searches_query; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wordstat_searches_query ON public.wordstat_searches USING btree (query);


--
-- Name: idx_wordstat_searches_source_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wordstat_searches_source_id ON public.wordstat_searches USING btree (source_id);


--
-- Name: analytics analytics_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analytics
    ADD CONSTRAINT analytics_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id) ON DELETE SET NULL;


--
-- Name: chat_participants chat_participants_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chats chats_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: collections collections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: content_plans content_plans_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_plans
    ADD CONSTRAINT content_plans_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: events events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: feeds feeds_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feeds
    ADD CONSTRAINT feeds_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id) ON DELETE SET NULL;


--
-- Name: logs logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: parsing_state parsing_state_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parsing_state
    ADD CONSTRAINT parsing_state_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id) ON DELETE CASCADE;


--
-- Name: products products_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_assigned_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_by_id_fkey FOREIGN KEY (assigned_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: templates templates_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tracked_posts tracked_posts_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tracked_posts
    ADD CONSTRAINT tracked_posts_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id) ON DELETE SET NULL;


--
-- Name: wordstat_searches wordstat_searches_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wordstat_searches
    ADD CONSTRAINT wordstat_searches_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.data_sources(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 3iOYVCyFclAb2gUOUikL1QkDrqu0LQdeK1pjywmLnEpdsNVikr4PyBD6JiSnSVb

