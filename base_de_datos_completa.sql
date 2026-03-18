--
-- PostgreSQL database dump
--

\restrict U3IkJ6PL2EjCrxJcugCHOF8QdS8fxocCzx2tF0SVR31IJSVUVRFDWVyuUOVYfJ9

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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

--
-- Name: challenge_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.challenge_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'completed',
    'cancelled'
);


ALTER TYPE public.challenge_status OWNER TO postgres;

--
-- Name: discipline; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.discipline AS ENUM (
    'ninjutsu',
    'jiujitsu'
);


ALTER TYPE public.discipline OWNER TO postgres;

--
-- Name: fight_discipline; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.fight_discipline AS ENUM (
    'mma',
    'box',
    'jiujitsu',
    'muay_thai',
    'ninjutsu',
    'otro'
);


ALTER TYPE public.fight_discipline OWNER TO postgres;

--
-- Name: fight_method; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.fight_method AS ENUM (
    'ko',
    'tko',
    'sumision',
    'decision',
    'decision_unanime',
    'decision_dividida',
    'descalificacion',
    'no_contest'
);


ALTER TYPE public.fight_method OWNER TO postgres;

--
-- Name: fight_result; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.fight_result AS ENUM (
    'victoria',
    'derrota',
    'empate'
);


ALTER TYPE public.fight_result OWNER TO postgres;

--
-- Name: membership_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.membership_status AS ENUM (
    'activo',
    'inactivo',
    'pausado'
);


ALTER TYPE public.membership_status OWNER TO postgres;

--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_method AS ENUM (
    'nequi',
    'daviplata',
    'banco',
    'link',
    'tarjeta'
);


ALTER TYPE public.payment_method OWNER TO postgres;

--
-- Name: subscription_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscription_level AS ENUM (
    'basico',
    'medio',
    'avanzado',
    'personalizado'
);


ALTER TYPE public.subscription_level OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'profesor',
    'alumno'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: anthropometric_evaluations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anthropometric_evaluations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    initial_weight real,
    current_weight real,
    target_weight real,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.anthropometric_evaluations OWNER TO postgres;

--
-- Name: anthropometric_evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.anthropometric_evaluations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anthropometric_evaluations_id_seq OWNER TO postgres;

--
-- Name: anthropometric_evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.anthropometric_evaluations_id_seq OWNED BY public.anthropometric_evaluations.id;


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- Name: belt_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.belt_applications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    discipline public.discipline NOT NULL,
    target_belt_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    applied_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.belt_applications OWNER TO postgres;

--
-- Name: belt_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.belt_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.belt_applications_id_seq OWNER TO postgres;

--
-- Name: belt_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.belt_applications_id_seq OWNED BY public.belt_applications.id;


--
-- Name: belt_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.belt_definitions (
    id integer NOT NULL,
    discipline public.discipline NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(50) NOT NULL,
    order_index integer NOT NULL,
    description text
);


ALTER TABLE public.belt_definitions OWNER TO postgres;

--
-- Name: belt_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.belt_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.belt_definitions_id_seq OWNER TO postgres;

--
-- Name: belt_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.belt_definitions_id_seq OWNED BY public.belt_definitions.id;


--
-- Name: belt_exams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.belt_exams (
    id integer NOT NULL,
    belt_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    duration_minutes integer,
    passing_score integer
);


ALTER TABLE public.belt_exams OWNER TO postgres;

--
-- Name: belt_exams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.belt_exams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.belt_exams_id_seq OWNER TO postgres;

--
-- Name: belt_exams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.belt_exams_id_seq OWNED BY public.belt_exams.id;


--
-- Name: belt_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.belt_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    discipline public.discipline NOT NULL,
    belt_id integer NOT NULL,
    promoted_by integer,
    achieved_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text
);


ALTER TABLE public.belt_history OWNER TO postgres;

--
-- Name: belt_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.belt_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.belt_history_id_seq OWNER TO postgres;

--
-- Name: belt_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.belt_history_id_seq OWNED BY public.belt_history.id;


--
-- Name: belt_requirements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.belt_requirements (
    id integer NOT NULL,
    belt_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    order_index integer NOT NULL
);


ALTER TABLE public.belt_requirements OWNER TO postgres;

--
-- Name: belt_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.belt_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.belt_requirements_id_seq OWNER TO postgres;

--
-- Name: belt_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.belt_requirements_id_seq OWNED BY public.belt_requirements.id;


--
-- Name: challenges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.challenges (
    id integer NOT NULL,
    challenger_id integer NOT NULL,
    challenged_id integer NOT NULL,
    training_system_id integer NOT NULL,
    scheduled_at timestamp without time zone NOT NULL,
    notes text,
    status public.challenge_status DEFAULT 'pending'::public.challenge_status NOT NULL,
    winner_id integer,
    responded_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    cancel_requested_by integer
);


ALTER TABLE public.challenges OWNER TO postgres;

--
-- Name: challenges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.challenges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.challenges_id_seq OWNER TO postgres;

--
-- Name: challenges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.challenges_id_seq OWNED BY public.challenges.id;


--
-- Name: class_attendances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_attendances (
    id integer NOT NULL,
    class_id integer NOT NULL,
    user_id integer NOT NULL,
    attended_at timestamp without time zone DEFAULT now() NOT NULL,
    rating integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT class_attendances_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.class_attendances OWNER TO postgres;

--
-- Name: class_attendances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.class_attendances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.class_attendances_id_seq OWNER TO postgres;

--
-- Name: class_attendances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.class_attendances_id_seq OWNED BY public.class_attendances.id;


--
-- Name: class_training_systems; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_training_systems (
    id integer NOT NULL,
    class_id integer NOT NULL,
    training_system_id integer NOT NULL
);


ALTER TABLE public.class_training_systems OWNER TO postgres;

--
-- Name: class_training_systems_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.class_training_systems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.class_training_systems_id_seq OWNER TO postgres;

--
-- Name: class_training_systems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.class_training_systems_id_seq OWNED BY public.class_training_systems.id;


--
-- Name: classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classes (
    id integer NOT NULL,
    created_by_user_id integer NOT NULL,
    notes text,
    qr_token character varying(100) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    professor_user_id integer
);


ALTER TABLE public.classes OWNER TO postgres;

--
-- Name: classes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.classes_id_seq OWNER TO postgres;

--
-- Name: classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.classes_id_seq OWNED BY public.classes.id;


--
-- Name: event_attendees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_attendees (
    id integer NOT NULL,
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    will_attend boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.event_attendees OWNER TO postgres;

--
-- Name: event_attendees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_attendees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_attendees_id_seq OWNER TO postgres;

--
-- Name: event_attendees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_attendees_id_seq OWNED BY public.event_attendees.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    cover_image_url text,
    event_date timestamp without time zone NOT NULL,
    location character varying(300) NOT NULL,
    created_by_user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: exercise_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exercise_categories (
    id integer NOT NULL,
    training_system_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    order_index integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    image_url text
);


ALTER TABLE public.exercise_categories OWNER TO postgres;

--
-- Name: exercise_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exercise_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exercise_categories_id_seq OWNER TO postgres;

--
-- Name: exercise_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exercise_categories_id_seq OWNED BY public.exercise_categories.id;


--
-- Name: exercises; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exercises (
    id integer NOT NULL,
    training_system_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    video_url text,
    image_url text,
    duration_minutes integer,
    level character varying(50),
    order_index integer DEFAULT 0 NOT NULL,
    created_by_user_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    exercise_category_id integer
);


ALTER TABLE public.exercises OWNER TO postgres;

--
-- Name: exercises_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exercises_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exercises_id_seq OWNER TO postgres;

--
-- Name: exercises_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exercises_id_seq OWNED BY public.exercises.id;


--
-- Name: fights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fights (
    id integer NOT NULL,
    user_id integer NOT NULL,
    opponent_name character varying(255) NOT NULL,
    event_name character varying(255),
    fight_date date NOT NULL,
    result public.fight_result NOT NULL,
    method public.fight_method,
    discipline public.fight_discipline NOT NULL,
    rounds integer,
    notes text,
    registered_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fights OWNER TO postgres;

--
-- Name: fights_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fights_id_seq OWNER TO postgres;

--
-- Name: fights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fights_id_seq OWNED BY public.fights.id;


--
-- Name: knowledge_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_categories (
    id integer NOT NULL,
    training_system_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    order_index integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    image_url text
);


ALTER TABLE public.knowledge_categories OWNER TO postgres;

--
-- Name: knowledge_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knowledge_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knowledge_categories_id_seq OWNER TO postgres;

--
-- Name: knowledge_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knowledge_categories_id_seq OWNED BY public.knowledge_categories.id;


--
-- Name: knowledge_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_items (
    id integer NOT NULL,
    training_system_id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text,
    video_url text,
    image_url text,
    order_index integer DEFAULT 0 NOT NULL,
    created_by_user_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    knowledge_category_id integer
);


ALTER TABLE public.knowledge_items OWNER TO postgres;

--
-- Name: knowledge_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knowledge_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knowledge_items_id_seq OWNER TO postgres;

--
-- Name: knowledge_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knowledge_items_id_seq OWNED BY public.knowledge_items.id;


--
-- Name: notification_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_reads (
    id integer NOT NULL,
    notification_id integer NOT NULL,
    user_id integer NOT NULL,
    read_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notification_reads OWNER TO postgres;

--
-- Name: notification_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_reads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_reads_id_seq OWNER TO postgres;

--
-- Name: notification_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_reads_id_seq OWNED BY public.notification_reads.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    created_by_user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    target character varying(20) DEFAULT 'todas'::character varying NOT NULL,
    target_user_id integer
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    payment_date date NOT NULL,
    expires_date date NOT NULL,
    amount integer,
    payment_method public.payment_method NOT NULL,
    notes text,
    registered_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payment_history OWNER TO postgres;

--
-- Name: payment_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_history_id_seq OWNER TO postgres;

--
-- Name: payment_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_history_id_seq OWNED BY public.payment_history.id;


--
-- Name: profesor_students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profesor_students (
    id integer NOT NULL,
    profesor_id integer NOT NULL,
    alumno_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.profesor_students OWNER TO postgres;

--
-- Name: profesor_students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profesor_students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profesor_students_id_seq OWNER TO postgres;

--
-- Name: profesor_students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profesor_students_id_seq OWNED BY public.profesor_students.id;


--
-- Name: push_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.push_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(500) NOT NULL,
    platform character varying(20) DEFAULT 'unknown'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.push_tokens OWNER TO postgres;

--
-- Name: push_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.push_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.push_tokens_id_seq OWNER TO postgres;

--
-- Name: push_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.push_tokens_id_seq OWNED BY public.push_tokens.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: student_belt_unlocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_belt_unlocks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    discipline public.discipline NOT NULL,
    target_belt_id integer NOT NULL,
    unlocked_by integer NOT NULL,
    unlocked_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text
);


ALTER TABLE public.student_belt_unlocks OWNER TO postgres;

--
-- Name: student_belt_unlocks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_belt_unlocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_belt_unlocks_id_seq OWNER TO postgres;

--
-- Name: student_belt_unlocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_belt_unlocks_id_seq OWNED BY public.student_belt_unlocks.id;


--
-- Name: student_belts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_belts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    discipline public.discipline NOT NULL,
    current_belt_id integer NOT NULL,
    next_unlocked boolean DEFAULT false NOT NULL,
    unlocked_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_belts OWNER TO postgres;

--
-- Name: student_belts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_belts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_belts_id_seq OWNER TO postgres;

--
-- Name: student_belts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_belts_id_seq OWNED BY public.student_belts.id;


--
-- Name: student_requirement_checks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_requirement_checks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    requirement_id integer NOT NULL,
    checked_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_requirement_checks OWNER TO postgres;

--
-- Name: student_requirement_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_requirement_checks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_requirement_checks_id_seq OWNER TO postgres;

--
-- Name: student_requirement_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_requirement_checks_id_seq OWNED BY public.student_requirement_checks.id;


--
-- Name: training_systems; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.training_systems (
    id integer NOT NULL,
    key character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.training_systems OWNER TO postgres;

--
-- Name: training_systems_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.training_systems_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.training_systems_id_seq OWNER TO postgres;

--
-- Name: training_systems_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.training_systems_id_seq OWNED BY public.training_systems.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role public.user_role NOT NULL,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO postgres;

--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: user_roles_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_roles_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_user_id_seq OWNER TO postgres;

--
-- Name: user_roles_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_roles_user_id_seq OWNED BY public.user_roles.user_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    display_name character varying(255) NOT NULL,
    avatar_url text,
    subscription_level public.subscription_level DEFAULT 'basico'::public.subscription_level NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_fighter boolean DEFAULT false NOT NULL,
    phone character varying(50),
    sedes text[] DEFAULT '{}'::text[] NOT NULL,
    membership_status public.membership_status DEFAULT 'activo'::public.membership_status NOT NULL,
    membership_expires_at timestamp without time zone,
    trial_ends_at timestamp without time zone,
    last_payment_at timestamp without time zone,
    membership_notes text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: anthropometric_evaluations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anthropometric_evaluations ALTER COLUMN id SET DEFAULT nextval('public.anthropometric_evaluations_id_seq'::regclass);


--
-- Name: belt_applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_applications ALTER COLUMN id SET DEFAULT nextval('public.belt_applications_id_seq'::regclass);


--
-- Name: belt_definitions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_definitions ALTER COLUMN id SET DEFAULT nextval('public.belt_definitions_id_seq'::regclass);


--
-- Name: belt_exams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_exams ALTER COLUMN id SET DEFAULT nextval('public.belt_exams_id_seq'::regclass);


--
-- Name: belt_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_history ALTER COLUMN id SET DEFAULT nextval('public.belt_history_id_seq'::regclass);


--
-- Name: belt_requirements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_requirements ALTER COLUMN id SET DEFAULT nextval('public.belt_requirements_id_seq'::regclass);


--
-- Name: challenges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges ALTER COLUMN id SET DEFAULT nextval('public.challenges_id_seq'::regclass);


--
-- Name: class_attendances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_attendances ALTER COLUMN id SET DEFAULT nextval('public.class_attendances_id_seq'::regclass);


--
-- Name: class_training_systems id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_training_systems ALTER COLUMN id SET DEFAULT nextval('public.class_training_systems_id_seq'::regclass);


--
-- Name: classes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes ALTER COLUMN id SET DEFAULT nextval('public.classes_id_seq'::regclass);


--
-- Name: event_attendees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_attendees ALTER COLUMN id SET DEFAULT nextval('public.event_attendees_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: exercise_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exercise_categories ALTER COLUMN id SET DEFAULT nextval('public.exercise_categories_id_seq'::regclass);


--
-- Name: exercises id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exercises ALTER COLUMN id SET DEFAULT nextval('public.exercises_id_seq'::regclass);


--
-- Name: fights id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fights ALTER COLUMN id SET DEFAULT nextval('public.fights_id_seq'::regclass);


--
-- Name: knowledge_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_categories ALTER COLUMN id SET DEFAULT nextval('public.knowledge_categories_id_seq'::regclass);


--
-- Name: knowledge_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_items ALTER COLUMN id SET DEFAULT nextval('public.knowledge_items_id_seq'::regclass);


--
-- Name: notification_reads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_reads ALTER COLUMN id SET DEFAULT nextval('public.notification_reads_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payment_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history ALTER COLUMN id SET DEFAULT nextval('public.payment_history_id_seq'::regclass);


--
-- Name: profesor_students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profesor_students ALTER COLUMN id SET DEFAULT nextval('public.profesor_students_id_seq'::regclass);


--
-- Name: push_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_tokens ALTER COLUMN id SET DEFAULT nextval('public.push_tokens_id_seq'::regclass);


--
-- Name: student_belt_unlocks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_belt_unlocks ALTER COLUMN id SET DEFAULT nextval('public.student_belt_unlocks_id_seq'::regclass);


--
-- Name: student_belts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_belts ALTER COLUMN id SET DEFAULT nextval('public.student_belts_id_seq'::regclass);


--
-- Name: student_requirement_checks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_requirement_checks ALTER COLUMN id SET DEFAULT nextval('public.student_requirement_checks_id_seq'::regclass);


--
-- Name: training_systems id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_systems ALTER COLUMN id SET DEFAULT nextval('public.training_systems_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: user_roles user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN user_id SET DEFAULT nextval('public.user_roles_user_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: anthropometric_evaluations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.anthropometric_evaluations (id, user_id, initial_weight, current_weight, target_weight, created_at, updated_at) FROM stdin;
2	4	81	77	70	2026-03-15 06:18:04.6811	2026-03-15 08:07:14.93
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (key, value, updated_at) FROM stdin;
whatsapp_admin_number	3016986643	2026-03-15 05:37:01.366
payment_link_url	https://proyectokaizenm.com	2026-03-15 05:37:01.367
bogota_video_url		2026-03-15 05:37:01.367
chia_video_url		2026-03-15 05:37:01.367
bogota_address	Cl. 131 #45-32	2026-03-15 05:37:01.368
chia_address	Cra 10 # 13-30	2026-03-15 05:37:01.368
\.


--
-- Data for Name: belt_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.belt_applications (id, user_id, discipline, target_belt_id, status, applied_at, updated_at) FROM stdin;
2	4	ninjutsu	14	approved	2026-03-14 20:14:16.73229	2026-03-14 21:01:42.513
1	4	jiujitsu	25	approved	2026-03-14 20:14:05.172173	2026-03-14 21:01:43.789
3	4	ninjutsu	15	approved	2026-03-14 21:14:49.866005	2026-03-14 21:14:55.718
4	5	ninjutsu	15	pending	2026-03-14 22:10:35.079199	2026-03-14 22:10:35.079199
5	4	ninjutsu	16	approved	2026-03-15 01:18:46.537692	2026-03-15 01:19:07.599
6	8	ninjutsu	14	pending	2026-03-17 13:31:51.685446	2026-03-17 13:31:51.685446
7	10	ninjutsu	14	pending	2026-03-17 17:14:32.443768	2026-03-17 17:14:32.443768
\.


--
-- Data for Name: belt_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.belt_definitions (id, discipline, name, color, order_index, description) FROM stdin;
16	ninjutsu	Azul	#1E90FF	2	Fluidez del agua
17	ninjutsu	Azul franja roja	#1E90FF	3	Transición avanzada — cinturón azul con franja roja
18	ninjutsu	Rojo	#CC0000	4	Fuego del guerrero
19	ninjutsu	Verde	#228B22	5	Conexión con la naturaleza
20	ninjutsu	Marrón	#8B4513	6	Raíces del guerrero
21	ninjutsu	Violeta	#6A0DAD	7	Sabiduría profunda
23	ninjutsu	Negro	#000000	9	Dominio del arte
14	ninjutsu	Blanco	#FFFFFF	0	Inicio del camino ninja
15	ninjutsu	Amarillo	#FFD700	1	Primer rayo de sol
24	jiujitsu	Blanco	#FFFFFF	0	Inicio del camino del arte suave
25	jiujitsu	Blanco 1 franja	#FFFFFF	1	Primera marca de progreso
26	jiujitsu	Blanco 2 franja	#FFFFFF	2	Segunda marca de progreso
27	jiujitsu	Blanco 3 franja	#FFFFFF	3	Tercera marca de progreso
28	jiujitsu	Blanco 4 franja	#FFFFFF	4	Cuarta marca de progreso
29	jiujitsu	Azul	#1565C0	5	Primer rango avanzado del arte suave
30	jiujitsu	Azul 1 franja	#1565C0	6	Primera marca de azul
31	jiujitsu	Azul 2 franja	#1565C0	7	Segunda marca de azul
32	jiujitsu	Azul 3 franja	#1565C0	8	Tercera marca de azul
33	jiujitsu	Azul 4 franjas	#1565C0	9	Cuarta marca de azul
34	jiujitsu	Púrpura	#7B1FA2	10	Grado intermedio avanzado
35	jiujitsu	Púrpura 1 franja	#7B1FA2	11	Primera marca de púrpura
36	jiujitsu	Púrpura 2 franja	#7B1FA2	12	Segunda marca de púrpura
37	jiujitsu	Púrpura 3 franja	#7B1FA2	13	Tercera marca de púrpura
38	jiujitsu	Púrpura 4 franja	#7B1FA2	14	Cuarta marca de púrpura
39	jiujitsu	Marrón	#5D4037	15	Pre-élite del arte suave
40	jiujitsu	Marrón 1 franja	#5D4037	16	Primera marca de marrón
41	jiujitsu	Marrón 2 franja	#5D4037	17	Segunda marca de marrón
42	jiujitsu	Marrón 3 franja	#5D4037	18	Tercera marca de marrón
43	jiujitsu	Marrón 4 franja	#5D4037	19	Cuarta marca de marrón
44	jiujitsu	Negro	#1C1C1C	20	Maestría del arte suave
45	jiujitsu	Negro 1 franja	#1C1C1C	21	Primera dan — Coral
46	jiujitsu	Negro 2 franja	#1C1C1C	22	Segunda dan — Coral
47	jiujitsu	Negro 3 franja	#1C1C1C	23	Tercera dan — Coral
48	jiujitsu	Negro 4 franja	#1C1C1C	24	Cuarta dan — Coral
22	ninjutsu	Violeta punta negra	#6A0DAD	8	A las puertas del dominio
49	ninjutsu	1 Dan	#000000	10	Primer grado — iniciación en el camino del ninja
50	ninjutsu	2 Dan	#000000	11	Segundo grado — consolidación de fundamentos
51	ninjutsu	3 Dan	#000000	12	Tercer grado — maestría intermedia
52	ninjutsu	4 Dan	#000000	13	Cuarto grado — dominio técnico avanzado
53	ninjutsu	5 Dan	#000000	14	Quinto grado — nivel de experto
54	ninjutsu	6 Dan	#000000	15	Sexto grado — maestría superior
55	ninjutsu	7 Dan	#000000	16	Séptimo grado — maestra elevada
56	ninjutsu	8 Dan	#000000	17	Octavo grado — gran maestro
57	ninjutsu	9 Dan	#000000	18	Noveno grado — suprema maestría
\.


--
-- Data for Name: belt_exams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.belt_exams (id, belt_id, title, description, duration_minutes, passing_score) FROM stdin;
14	14	Examen de Ingreso Ninjutsu	Evaluación de conocimientos básicos y aptitud física para ingreso a la disciplina.	30	60
15	15	Examen Cinturón Amarillo Ninjutsu	Evaluación teórico-práctica de técnicas del nivel correspondiente. Incluye demostración de kata y combate controlado.	45	65
16	16	Examen Cinturón Azul Ninjutsu	Evaluación teórico-práctica de técnicas del nivel correspondiente. Incluye demostración de kata y combate controlado.	45	65
17	17	Examen Cinturón Azul franja roja Ninjutsu	Evaluación de transición con énfasis en sigilo y armas básicas.	60	68
18	18	Examen Cinturón Rojo Ninjutsu	Evaluación avanzada con proyecciones, luxaciones y defensa personal.	60	70
19	19	Examen Cinturón Verde Ninjutsu	Examen avanzado con evaluación de técnicas complejas, estrategia de combate y enseñanza básica.	60	70
20	20	Examen Cinturón Marrón Ninjutsu	Examen de maestría con evaluación exhaustiva de técnicas, liderazgo y capacidad de instrucción.	90	75
21	21	Examen Cinturón Violeta Ninjutsu	Examen avanzado con técnicas de espionaje, supervivencia y enseñanza.	90	75
22	22	Examen Cinturón Violeta punta negra Ninjutsu	Examen de integración: dominio completo, mentoring y filosofía.	90	78
23	23	Examen Cinturón Negro Ninjutsu	Examen final de dan. Demostración completa del arte marcial, defensa personal avanzada y filosofía marcial.	120	80
24	24	Examen de Ingreso Jiujitsu	Evaluación de conocimientos básicos y aptitud física para ingreso a la disciplina.	30	60
25	25	Examen Cinturón Blanco 1 franja Jiujitsu		60	70
26	26	Examen Cinturón Blanco 2 franja Jiujitsu		60	70
27	27	Examen Cinturón Blanco 3 franja Jiujitsu		60	70
28	28	Examen Cinturón Blanco 4 franja Jiujitsu		60	70
29	29	Examen Cinturón Azul Jiujitsu	Evaluación teórico-práctica de técnicas del nivel correspondiente. Incluye demostración de kata y combate controlado.	45	65
30	30	Examen Cinturón Azul 1 franja Jiujitsu		60	70
31	31	Examen Cinturón Azul 2 franja Jiujitsu		60	70
32	32	Examen Cinturón Azul 3 franja Jiujitsu		60	70
33	33	Examen Cinturón Azul 4 franjas Jiujitsu		60	70
34	34	Examen Cinturón Púrpura Jiujitsu		60	70
35	35	Examen Cinturón Púrpura 1 franja Jiujitsu		60	70
36	36	Examen Cinturón Púrpura 2 franja Jiujitsu		60	70
37	37	Examen Cinturón Púrpura 3 franja Jiujitsu		60	70
38	38	Examen Cinturón Púrpura 4 franja Jiujitsu		60	70
39	39	Examen Cinturón Marrón Jiujitsu	Examen de maestría con evaluación exhaustiva de técnicas, liderazgo y capacidad de instrucción.	90	75
40	40	Examen Cinturón Marrón 1 franja Jiujitsu		60	70
41	41	Examen Cinturón Marrón 2 franja Jiujitsu		60	70
42	42	Examen Cinturón Marrón 3 franja Jiujitsu		60	70
43	43	Examen Cinturón Marrón 4 franja Jiujitsu		60	70
44	44	Examen Cinturón Negro Jiujitsu	Examen final de dan. Demostración completa del arte marcial, defensa personal avanzada y filosofía marcial.	120	80
45	45	Examen Cinturón Negro 1 franja Jiujitsu		60	70
46	46	Examen Cinturón Negro 2 franja Jiujitsu		60	70
47	47	Examen Cinturón Negro 3 franja Jiujitsu		60	70
48	48	Examen Cinturón Negro 4 franja Jiujitsu		60	70
49	49	Examen Cinturón 1 Dan Ninjutsu		60	70
50	50	Examen Cinturón 2 Dan Ninjutsu		60	70
51	51	Examen Cinturón 3 Dan Ninjutsu		60	70
52	52	Examen Cinturón 4 Dan Ninjutsu		60	70
53	53	Examen Cinturón 5 Dan Ninjutsu		60	70
54	54	Examen Cinturón 6 Dan Ninjutsu		60	70
55	55	Examen Cinturón 7 Dan Ninjutsu		60	70
56	56	Examen Cinturón 8 Dan Ninjutsu		60	70
57	57	Examen Cinturón 9 Dan Ninjutsu		60	70
\.


--
-- Data for Name: belt_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.belt_history (id, user_id, discipline, belt_id, promoted_by, achieved_at, notes) FROM stdin;
10	5	ninjutsu	14	\N	2026-03-14 19:42:36.896887	Cinturón inicial asignado por administrador
11	5	jiujitsu	24	\N	2026-03-14 19:42:36.908718	Cinturón inicial asignado por administrador
12	4	jiujitsu	24	4	2026-03-14 20:13:47.24956	Cinturón blanco: inscripción automática
13	4	ninjutsu	14	4	2026-03-14 21:01:42.512974	Postulación aprobada — Blanco
14	4	jiujitsu	25	4	2026-03-14 21:01:43.789851	Postulación aprobada — Blanco 1 franja
15	4	ninjutsu	15	4	2026-03-14 21:14:55.718341	Postulación aprobada — Amarillo
16	4	ninjutsu	16	4	2026-03-15 01:19:07.598824	Postulación aprobada — Azul
19	8	jiujitsu	24	8	2026-03-17 13:32:19.388565	Cinturón blanco: inscripción automática
20	9	ninjutsu	23	4	2026-03-17 15:45:59.87041	Asignado por administrador
21	9	jiujitsu	39	4	2026-03-17 15:46:10.837821	Asignado por administrador
22	9	ninjutsu	53	4	2026-03-17 15:51:32.632128	Asignado por administrador
\.


--
-- Data for Name: belt_requirements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.belt_requirements (id, belt_id, title, description, order_index) FROM stdin;
120	15	Elasticidad perfecta en cualquier posición	\N	12
121	15	Patadas tipo A y B	Con las dos piernas	13
122	15	Flexiones imposibles	10 tipos 5 repeticiones	14
123	15	Barras 15 repeticiones 2 posiciones, 15 fondos y un anclaje con ambas manos	\N	15
124	15	Incorporaciones (5)	\N	16
125	15	O Guruma	2 y 1 Mano por ambos lados	17
126	15	Salto alto 1.20m	\N	18
127	15	Vela 1min	\N	19
128	15	Mosca 30 seg	\N	20
129	15	Paloma con apoyo	Manos, rodillas, en solitario	21
130	15	Paloma en una mano	\N	22
131	15	Mawate adelante y atrás	20 seguidos cualquier tipo terminando de pie	23
132	15	Pescado 1.10m	\N	24
133	15	Pescado distancia 1.10m	\N	25
134	15	Desplazamiento	5 Tipo tierra	26
135	15	Salto con compañero en pie	10 en 10 segundos	27
136	15	Defensa personal	3 técnicas de defensa personal básica sin armas	28
137	15	Combate contra 2 gerines	\N	29
138	15	Prueba física	45 min con agua	30
49	15	Terminología	\N	1
51	15	Saludo tradicional de ninjutsu para el combate	\N	3
50	15	Historia del ninjutsu	\N	2
53	16	Patadas básicas	Mae geri, yoko geri	1
54	16	Combinaciones	Secuencias de golpe-patada	2
55	16	Esquivas	Tai sabaki	3
56	16	Kata básica	Forma de demostración	4
57	17	Armas tradicionales — introducción	Bo, shuriken, kunai básico	1
58	17	Técnicas de sigilo — iniciación	Shinobi iri básico	2
59	17	Combate intermedio	Randori básico controlado	3
60	17	Kata intermedia	Forma de transición	4
61	18	Proyecciones	Nage waza fundamentales	1
62	18	Luxaciones	Kansetsu waza básicas	2
63	18	Defensa personal	Escenarios de calle	3
64	18	Kata avanzada	Forma con armas	4
65	19	Armas tradicionales	Bo, shuriken, kunai dominio	1
66	19	Técnicas de sigilo	Shinobi iri avanzado	2
67	19	Combate avanzado	Randori controlado	3
68	19	Estrategia	Sun Tzu aplicado	4
69	20	Dominio de armas	Todas las armas tradicionales	1
70	20	Combate múltiple	Defensa contra múltiples oponentes	2
71	20	Filosofía marcial	Ninpō ikkan	3
72	20	Liderazgo	Dirigir entrenamientos	4
73	21	Técnicas de espionaje	Chōhō jutsu	1
74	21	Medicina de campo	Kusurigaku	2
75	21	Supervivencia	Inton jutsu	3
76	21	Enseñanza	Capacidad de instrucción	4
77	22	Integración completa	Dominio de todas las técnicas anteriores	1
78	22	Mentoring	Guía de alumnos de rangos inferiores	2
79	22	Filosofía avanzada	Ninpō en la vida cotidiana	3
80	22	Kata maestra	Creación de forma personal	4
81	23	Examen completo	Demostración total del arte	1
82	23	Tesis marcial	Documento de investigación	2
83	23	Combate maestro	Enfrentamiento con evaluadores	3
84	23	Juramento	Compromiso con el arte	4
85	14	Terminología	\N	1
86	14	Historia del ninjutsu	\N	2
87	14	Orden de los cinturones	\N	3
88	14	Datos generales de los Sensei y Shidoshi	\N	4
89	14	Frases en japonés	\N	5
90	14	Oración del ninja	\N	6
91	14	Capitales del cinturón asiático	\N	7
92	14	Anatomía (10 huesos y 10 músculos)	\N	8
94	14	Kata: X 5	\N	10
95	14	Flexiones imposibles	5 primeras 5 repeticiones	11
96	14	Barras	10 Repeticiones (2 Posiciones) 5 Fondos	12
97	14	Elasticidad	Una cuarta del piso - Cualquier posición	13
98	14	Patadas tipo A	Con las dos piernas	14
99	14	Dominación al dolor físico	Low Kick	15
100	14	5 Caídas	\N	16
101	14	Incorporaciones (2)	\N	17
102	14	Vela 30 segundos	\N	18
103	14	O guruma	1 y 2 manos por un solo lado	19
104	14	Salto alto 1.10m	Depende de la estatura	20
105	14	Mawate (10 repeticiones)	Adelante, atrás y de lado	21
106	14	Salto de compañeros en pie	8 en 10 segundos	22
107	14	Paloma con compañero	Nuca y rodillas	23
108	14	Pescado 1m	Depende de la estatura	24
109	14	Desplazamientos	3 Tipo tierra	25
110	14	Defensa personal efectiva	Explicación	26
111	14	Combates	1 intermedio	27
112	14	Prueba física	30 min con agua	28
52	15	Orden de los cinturones y los danes	Con su significado	4
113	15	Juramento	\N	5
114	15	Proverbios (3)	\N	6
115	15	Anatomía	Todos los huesos y todos los músculos	7
116	15	Bloqueos	Jodan -  Chudan - Gedan	8
117	15	Katas	Obis anteriores	9
118	15	Kata: X 10	\N	10
119	15	Mi Lu Kata Ichi	\N	11
93	14	Kata: Shuto Ichi	\N	9
\.


--
-- Data for Name: challenges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.challenges (id, challenger_id, challenged_id, training_system_id, scheduled_at, notes, status, winner_id, responded_at, created_at, cancel_requested_by) FROM stdin;
4	4	8	1	2026-03-17 17:19:00	\N	accepted	\N	2026-03-17 17:30:07.31	2026-03-17 17:19:08.244912	\N
\.


--
-- Data for Name: class_attendances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_attendances (id, class_id, user_id, attended_at, rating, created_at) FROM stdin;
8	9	4	2026-03-15 14:58:07.554256	5	2026-03-15 14:58:07.554256
7	8	4	2026-03-15 08:04:57.511294	5	2026-03-15 08:04:57.511294
9	11	4	2026-03-17 17:26:06.129262	5	2026-03-17 17:26:06.129262
\.


--
-- Data for Name: class_training_systems; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_training_systems (id, class_id, training_system_id) FROM stdin;
10	8	1
11	9	3
12	10	3
13	11	1
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classes (id, created_by_user_id, notes, qr_token, expires_at, created_at, professor_user_id) FROM stdin;
8	4	\N	17345ee8-8574-46ae-a665-15561416e3ef	2026-03-15 11:03:34.361	2026-03-15 08:03:34.3616	4
9	4	\N	6cc0db3c-eb85-4d45-b073-fd55aa333e71	2026-03-15 17:56:48.433	2026-03-15 14:56:48.433555	4
10	4	\N	f25cbe55-8273-4373-98b1-db9e96761753	2026-03-17 16:36:58.543	2026-03-17 13:36:58.543765	4
11	4	\N	0bce110f-e404-4ea6-a508-c1d4aac56a67	2026-03-17 20:25:16.812	2026-03-17 17:25:16.813093	9
\.


--
-- Data for Name: event_attendees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_attendees (id, event_id, user_id, will_attend, created_at) FROM stdin;
2	2	4	t	2026-03-17 14:36:53.979328
1	1	4	t	2026-03-17 14:36:52.735282
7	3	9	t	2026-03-17 17:40:00.657438
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, title, cover_image_url, event_date, location, created_by_user_id, created_at) FROM stdin;
1	Reinauguración de adashi	/objects/uploads/8b25766d-15a3-4d0d-90fe-2f934591228c	2026-03-11 03:08:00	Nueva sede adashi	4	2026-03-17 14:36:15.27915
2	Reinauguración Shinobi 2.0	/objects/uploads/4e46ac39-2064-443a-909a-3c6e131917d3	2026-03-20 22:00:00	Nueva sede shinobi	4	2026-03-17 14:36:48.017812
3	Intredisciplinas la	/objects/uploads/f25ec8cc-308f-4b21-8869-75a303aa56a1	2026-03-17 17:39:00	Academia	9	2026-03-17 17:39:56.026579
\.


--
-- Data for Name: exercise_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exercise_categories (id, training_system_id, name, description, order_index, is_active, created_at, image_url) FROM stdin;
5	1	Gimnasia	Ejercicios para coordinación, acrobacias y condición física	0	t	2026-03-15 01:55:00.371631	\N
6	1	Patadas	Técnicas de pateo, barridos y golpes con piernas	1	t	2026-03-15 01:55:00.371631	\N
7	1	Combates	Práctica de combate, sparring y aplicación de técnicas	2	t	2026-03-15 01:55:00.371631	\N
8	1	Resistencia al dolor	Entrenamiento de resistencia física y mental extrema	3	t	2026-03-15 01:55:00.371631	\N
9	1	Katas	Formas tradicionales y secuencias de técnicas codificadas	4	t	2026-03-15 01:55:00.371631	\N
\.


--
-- Data for Name: exercises; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exercises (id, training_system_id, title, description, video_url, image_url, duration_minutes, level, order_index, created_by_user_id, is_active, created_at, updated_at, exercise_category_id) FROM stdin;
2	1	Mawate Kiritsu	La kick up, o levantada ninja. Consiste en un ejercicio con múltiples elementos que deberán ser ejecutados al tiempo para funcionar:\nGiro, pateo, empuje, arco, cabeceo.	https://www.youtube.com/watch?v=T9Cq4NcvTQ4	\N	\N	basico	0	4	t	2026-03-15 00:16:46.730166	2026-03-17 16:11:31.137	5
\.


--
-- Data for Name: fights; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fights (id, user_id, opponent_name, event_name, fight_date, result, method, discipline, rounds, notes, registered_by, created_at) FROM stdin;
1	4	Shidoshi	UFC	2025-12-06	victoria	ko	mma	2	\N	4	2026-03-14 20:25:45.576015
2	7	Nuemagomedov	Campeonato Mundial	2026-03-15	victoria	sumision	mma	1	\N	4	2026-03-15 08:14:33.024128
\.


--
-- Data for Name: knowledge_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_categories (id, training_system_id, name, description, order_index, is_active, created_at, image_url) FROM stdin;
\.


--
-- Data for Name: knowledge_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_items (id, training_system_id, title, content, video_url, image_url, order_index, created_by_user_id, is_active, created_at, updated_at, knowledge_category_id) FROM stdin;
\.


--
-- Data for Name: notification_reads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_reads (id, notification_id, user_id, read_at) FROM stdin;
1	1	4	2026-03-14 22:34:16.242828
2	2	4	2026-03-15 01:22:12.335191
5	3	8	2026-03-17 15:03:02.411032
6	4	4	2026-03-17 15:05:07.570426
7	5	4	2026-03-17 15:05:07.570426
8	7	8	2026-03-17 15:34:57.258748
9	8	8	2026-03-17 15:34:57.258748
10	9	4	2026-03-17 15:35:30.637083
11	10	4	2026-03-17 15:35:30.637083
12	12	4	2026-03-17 17:21:18.893799
45	11	8	2026-03-17 17:29:48.303166
46	12	8	2026-03-17 17:29:48.303166
47	45	4	2026-03-17 17:30:36.56812
48	12	9	2026-03-17 17:31:14.439288
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, title, body, created_by_user_id, created_at, target, target_user_id) FROM stdin;
1	Clase de 5 cancelada	Gente la clase de las 5 queda cancelada	4	2026-03-14 22:29:42.263318	todas	\N
2	Cancelada clase 6	La clase de las 6 hoy se cancela	4	2026-03-15 01:22:05.391999	todas	\N
3	¡Te han retado!	Johan Rincon te reta en Ninjutsu	4	2026-03-17 15:00:14.380027	personal	8
4	Respuesta a tu reto	Toby aceptó tu reto	8	2026-03-17 15:03:09.329251	personal	4
5	Respuesta a tu reto	Toby aceptó tu reto	8	2026-03-17 15:03:10.178845	personal	4
6	¡Te han retado!	Johan Rincon te reta en MMA	4	2026-03-17 15:10:34.277419	personal	7
7	Solicitud de cancelación	Johan Rincon quiere cancelar el reto. Confirma o rechaza.	4	2026-03-17 15:33:41.576853	personal	8
8	Solicitud de cancelación	Johan Rincon quiere cancelar el reto. Confirma o rechaza.	4	2026-03-17 15:33:44.851408	personal	8
9	Reto cancelado	Toby aceptó cancelar el reto	8	2026-03-17 15:35:20.072408	personal	4
10	Reto cancelado	Toby aceptó cancelar el reto	8	2026-03-17 15:35:20.909951	personal	4
11	¡Te han retado!	Johan Rincon te reta en Ninjutsu	4	2026-03-17 17:19:08.259528	personal	8
12	Clase de 6 cancelada	Se corrrnla clase a las 7	4	2026-03-17 17:21:14.5397	todas	\N
45	Respuesta a tu reto	Toby aceptó tu reto	8	2026-03-17 17:30:07.314218	personal	4
\.


--
-- Data for Name: payment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_history (id, user_id, payment_date, expires_date, amount, payment_method, notes, registered_by, created_at, updated_at) FROM stdin;
1	4	2026-02-01	2026-03-01	300000	nequi	\N	4	2026-03-15 04:37:10.288322+00	2026-03-15 04:37:10.288322+00
2	5	2026-02-01	2026-03-01	100	nequi	\N	4	2026-03-15 04:45:25.304837+00	2026-03-15 04:45:25.304837+00
3	8	2026-01-17	2026-02-16	500000	daviplata	\N	4	2026-03-17 13:35:55.613966+00	2026-03-17 13:35:55.613966+00
4	8	2026-03-17	2026-04-16	300000	nequi	\N	4	2026-03-17 14:52:14.778768+00	2026-03-17 14:52:14.778768+00
5	5	2026-03-17	2026-04-16	350000	daviplata	\N	9	2026-03-17 17:33:15.081109+00	2026-03-17 17:33:15.081109+00
\.


--
-- Data for Name: profesor_students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profesor_students (id, profesor_id, alumno_id, assigned_at) FROM stdin;
\.


--
-- Data for Name: push_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.push_tokens (id, user_id, token, platform, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (sid, sess, expire) FROM stdin;
1GuvmE37XLCZm_w91Mh2TJmZ9vnkmpKr	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-13T20:01:47.733Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4}	2026-04-17 15:54:06
N5z-r1mh-hP4MhPMmgqyBmk-W7s0TGVW	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-16T17:31:10.183Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":9}	2026-04-16 18:26:02
cx5pqY9BKmYaOKk9n1C9-2O6sFVQpHV1	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-14T01:53:44.803Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4}	2026-04-14 01:53:45
2YG1yxRvY345HTUG5aOQb8azGbNV827w	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-13T22:32:01.722Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4}	2026-04-13 22:32:02
AoPhQzcFuj3NldjIYaY400MOOy8yRPew	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-13T20:54:34.869Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4}	2026-04-13 20:54:35
dSnoD9O38X6r27iDbAS1j5wgYglte6ga	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-13T20:54:39.321Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4}	2026-04-13 20:54:40
hpTM-tZJdeesvhTotg0-c9NEWEBgtS_6	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-13T20:54:43.324Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4}	2026-04-13 20:55:19
d0S0U32h2y33DA9hz7HHDCOzUPT4hBrX	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-13T23:56:25.698Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4}	2026-04-14 00:09:12
lFfqSI9OGuMfS8AnMQbOHdC2ssA0Iydt	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-14T03:59:33.758Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4}	2026-04-14 03:59:34
bvcEDCHuZwyVPFxc_rpLC-_5wbubN-I2	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-14T04:00:24.928Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4}	2026-04-14 04:00:25
0btAfyXb4t7AqGKGZWLbw2h0jQlWZMv9	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-04-14T01:09:13.633Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4}	2026-04-14 01:09:54
\.


--
-- Data for Name: student_belt_unlocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_belt_unlocks (id, user_id, discipline, target_belt_id, unlocked_by, unlocked_at, notes) FROM stdin;
\.


--
-- Data for Name: student_belts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_belts (id, user_id, discipline, current_belt_id, next_unlocked, unlocked_at, updated_at) FROM stdin;
9	5	ninjutsu	14	f	\N	2026-03-14 19:42:36.890932
10	5	jiujitsu	24	f	\N	2026-03-14 19:42:36.903238
11	4	jiujitsu	25	f	\N	2026-03-14 21:01:43.791
12	4	ninjutsu	16	f	\N	2026-03-15 01:19:07.601
15	8	jiujitsu	24	f	\N	2026-03-17 13:32:19.388565
17	9	jiujitsu	39	f	\N	2026-03-17 15:46:10.837821
16	9	ninjutsu	53	f	\N	2026-03-17 15:51:32.633
\.


--
-- Data for Name: student_requirement_checks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_requirement_checks (id, user_id, requirement_id, checked_at) FROM stdin;
1	4	85	2026-03-14 20:14:23.904121
2	4	86	2026-03-14 20:14:24.733127
3	4	87	2026-03-14 20:14:25.515799
4	5	51	2026-03-14 22:10:37.954965
5	5	50	2026-03-14 22:10:41.680018
6	5	49	2026-03-14 22:10:42.591424
7	5	52	2026-03-14 22:10:43.841702
8	8	85	2026-03-17 13:31:57.005731
9	8	86	2026-03-17 13:31:57.428656
10	8	87	2026-03-17 13:31:57.89039
11	8	88	2026-03-17 13:31:58.3358
12	8	89	2026-03-17 13:31:59.525609
13	8	90	2026-03-17 13:32:00.147908
14	10	85	2026-03-17 17:14:40.102867
15	10	86	2026-03-17 17:14:40.468782
16	10	87	2026-03-17 17:14:40.881546
17	10	88	2026-03-17 17:14:41.423464
18	10	89	2026-03-17 17:14:42.053125
\.


--
-- Data for Name: training_systems; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.training_systems (id, key, name, description, is_active, created_at) FROM stdin;
1	ninjutsu	Ninjutsu	El arte del ninja	t	2026-03-14 21:57:27.391971
2	mma	MMA	Artes marciales mixtas	t	2026-03-14 21:57:27.391971
3	box	Box	El arte del puño	t	2026-03-14 21:57:27.391971
4	jiujitsu	Jiujitsu	El arte suave	t	2026-03-14 21:57:27.391971
5	muaythai	Muay Thai	El arte de los ocho miembros	t	2026-03-14 21:57:27.391971
6	kickboxing	Kick Boxing	El arte del golpe y la patada	t	2026-03-14 21:57:27.391971
7	funcional	Funcional	Entrenamiento funcional	t	2026-03-14 21:57:27.391971
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role, assigned_at) FROM stdin;
6	4	admin	2026-03-14 14:52:49.846265
7	5	alumno	2026-03-14 19:42:36.884047
9	7	alumno	2026-03-15 06:19:42.323631
10	8	alumno	2026-03-17 13:30:20.876433
11	9	alumno	2026-03-17 15:27:06.737511
12	9	admin	2026-03-17 15:27:06.751569
13	10	alumno	2026-03-17 17:09:40.22134
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, display_name, avatar_url, subscription_level, created_at, updated_at, is_fighter, phone, sedes, membership_status, membership_expires_at, trial_ends_at, last_payment_at, membership_notes) FROM stdin;
10	johanrincon12@gmail.com	$2b$12$5RIjauAPPpacqF5ThB.GXu8VWbtnxmfcffCKCXzwlHGbOhk/qdx5S	Johan Rincon	\N	basico	2026-03-17 17:09:40.184665	2026-03-17 17:09:40.184665	f	(301) 698-6643	{chia}	activo	\N	2026-03-20 17:09:40.183	\N	\N
4	anuvis223@hotmail.com	$2b$12$tnkVLIWBgkqTyXqmKlflSe113TldwBY7MWgHTBAOSJa6gr8eY3LFC	Johan Rincon	/objects/uploads/aee03adb-a883-4f7c-9d19-9485a4fe2a68	personalizado	2026-03-14 14:52:49.810259	2026-03-17 17:17:50.323	t	3016986643	{bogota,chia}	activo	2026-03-01 23:59:59	\N	2026-02-01 12:00:00	\N
5	catalinasuarez@live.com	$2b$12$33nD3tWwq.2YTp4mMRUpseQscIl9peGybKtgT/q/yBNAsnCiwGgxC	Catalina Suarez	\N	basico	2026-03-14 19:42:36.868835	2026-03-15 04:26:04.745	f	3504134648	{}	activo	2026-04-16 23:59:59	\N	2026-03-17 12:00:00	\N
9	shidoshi@shinobi.com	$2b$12$mrCnKWh3P6OaGrDJ.FJWCOoFNlZNMeUJQfpY6GrB5rhPvpHfaUHf6	Shidoshi Yeison	/objects/uploads/4cc6efc0-b3d9-4927-bcfe-5637a205886a	avanzado	2026-03-17 15:27:06.703461	2026-03-17 18:23:23.948	f	3232920156	{bogota,chia}	activo	\N	\N	\N	\N
8	jrincon@emmat.edu.co	$2b$12$N5Xp57K7TIvsu72hiRt2V.6KQOoXkj5dYmcowHuQBCCSOColXdOGi	Toby	/objects/uploads/ba6a7073-dfb3-4729-8db2-5a3f7c81faad	basico	2026-03-17 13:30:20.770516	2026-03-17 15:37:22.134	t	(301) 698-6645	{chia}	activo	2026-04-16 23:59:59	2026-03-20 13:30:20.769	2026-03-17 12:00:00	\N
7	jesusiga@gmail.com	$2b$12$JcLP3Umq82eBI71.M9knQuOvDku3AHRcOb3a2KYXPiet9wzJEWUmq	Jesus Iga	/objects/uploads/48d7261b-801e-4f9f-847b-26f5916df2aa	basico	2026-03-15 06:19:42.319621	2026-03-17 15:37:52.928	t	\N	{chia}	activo	\N	2026-03-18 06:19:42.318	\N	\N
\.


--
-- Name: anthropometric_evaluations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.anthropometric_evaluations_id_seq', 2, true);


--
-- Name: belt_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.belt_applications_id_seq', 7, true);


--
-- Name: belt_definitions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.belt_definitions_id_seq', 57, true);


--
-- Name: belt_exams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.belt_exams_id_seq', 57, true);


--
-- Name: belt_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.belt_history_id_seq', 22, true);


--
-- Name: belt_requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.belt_requirements_id_seq', 138, true);


--
-- Name: challenges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.challenges_id_seq', 4, true);


--
-- Name: class_attendances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.class_attendances_id_seq', 9, true);


--
-- Name: class_training_systems_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.class_training_systems_id_seq', 13, true);


--
-- Name: classes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.classes_id_seq', 11, true);


--
-- Name: event_attendees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.event_attendees_id_seq', 7, true);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.events_id_seq', 3, true);


--
-- Name: exercise_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exercise_categories_id_seq', 9, true);


--
-- Name: exercises_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exercises_id_seq', 3, true);


--
-- Name: fights_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fights_id_seq', 2, true);


--
-- Name: knowledge_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knowledge_categories_id_seq', 1, false);


--
-- Name: knowledge_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knowledge_items_id_seq', 1, false);


--
-- Name: notification_reads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_reads_id_seq', 48, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 45, true);


--
-- Name: payment_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_history_id_seq', 5, true);


--
-- Name: profesor_students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profesor_students_id_seq', 3, true);


--
-- Name: push_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.push_tokens_id_seq', 1, false);


--
-- Name: student_belt_unlocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_belt_unlocks_id_seq', 2, true);


--
-- Name: student_belts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_belts_id_seq', 17, true);


--
-- Name: student_requirement_checks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.student_requirement_checks_id_seq', 18, true);


--
-- Name: training_systems_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.training_systems_id_seq', 7, true);


--
-- Name: user_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_roles_id_seq', 13, true);


--
-- Name: user_roles_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_roles_user_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 10, true);


--
-- Name: anthropometric_evaluations anthropometric_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anthropometric_evaluations
    ADD CONSTRAINT anthropometric_evaluations_pkey PRIMARY KEY (id);


--
-- Name: anthropometric_evaluations anthropometric_evaluations_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anthropometric_evaluations
    ADD CONSTRAINT anthropometric_evaluations_user_id_key UNIQUE (user_id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: belt_applications belt_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_applications
    ADD CONSTRAINT belt_applications_pkey PRIMARY KEY (id);


--
-- Name: belt_definitions belt_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_definitions
    ADD CONSTRAINT belt_definitions_pkey PRIMARY KEY (id);


--
-- Name: belt_exams belt_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_exams
    ADD CONSTRAINT belt_exams_pkey PRIMARY KEY (id);


--
-- Name: belt_history belt_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_history
    ADD CONSTRAINT belt_history_pkey PRIMARY KEY (id);


--
-- Name: belt_requirements belt_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_requirements
    ADD CONSTRAINT belt_requirements_pkey PRIMARY KEY (id);


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);


--
-- Name: class_attendances class_attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_attendances
    ADD CONSTRAINT class_attendances_pkey PRIMARY KEY (id);


--
-- Name: class_training_systems class_training_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_training_systems
    ADD CONSTRAINT class_training_systems_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: classes classes_qr_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_qr_token_key UNIQUE (qr_token);


--
-- Name: event_attendees event_attendees_event_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_event_id_user_id_key UNIQUE (event_id, user_id);


--
-- Name: event_attendees event_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: exercise_categories exercise_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exercise_categories
    ADD CONSTRAINT exercise_categories_pkey PRIMARY KEY (id);


--
-- Name: exercises exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_pkey PRIMARY KEY (id);


--
-- Name: fights fights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_pkey PRIMARY KEY (id);


--
-- Name: knowledge_categories knowledge_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_categories
    ADD CONSTRAINT knowledge_categories_pkey PRIMARY KEY (id);


--
-- Name: knowledge_items knowledge_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_items
    ADD CONSTRAINT knowledge_items_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_history payment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (id);


--
-- Name: profesor_students profesor_students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profesor_students
    ADD CONSTRAINT profesor_students_pkey PRIMARY KEY (id);


--
-- Name: push_tokens push_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: student_belt_unlocks student_belt_unlocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_belt_unlocks
    ADD CONSTRAINT student_belt_unlocks_pkey PRIMARY KEY (id);


--
-- Name: student_belts student_belts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_belts
    ADD CONSTRAINT student_belts_pkey PRIMARY KEY (id);


--
-- Name: student_requirement_checks student_requirement_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_requirement_checks
    ADD CONSTRAINT student_requirement_checks_pkey PRIMARY KEY (id);


--
-- Name: training_systems training_systems_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_systems
    ADD CONSTRAINT training_systems_key_key UNIQUE (key);


--
-- Name: training_systems training_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_systems
    ADD CONSTRAINT training_systems_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: belt_apps_user_disc_belt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX belt_apps_user_disc_belt_idx ON public.belt_applications USING btree (user_id, discipline, target_belt_id);


--
-- Name: belt_definitions_discipline_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX belt_definitions_discipline_order_idx ON public.belt_definitions USING btree (discipline, order_index);


--
-- Name: belt_exams_belt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX belt_exams_belt_idx ON public.belt_exams USING btree (belt_id);


--
-- Name: class_attendances_class_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX class_attendances_class_user_idx ON public.class_attendances USING btree (class_id, user_id);


--
-- Name: class_training_systems_class_system_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX class_training_systems_class_system_idx ON public.class_training_systems USING btree (class_id, training_system_id);


--
-- Name: notification_reads_notif_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX notification_reads_notif_user_idx ON public.notification_reads USING btree (notification_id, user_id);


--
-- Name: profesor_students_profesor_alumno_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profesor_students_profesor_alumno_idx ON public.profesor_students USING btree (profesor_id, alumno_id);


--
-- Name: push_tokens_user_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX push_tokens_user_token_idx ON public.push_tokens USING btree (user_id, token);


--
-- Name: student_belts_user_discipline_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX student_belts_user_discipline_idx ON public.student_belts USING btree (user_id, discipline);


--
-- Name: student_req_checks_user_req_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX student_req_checks_user_req_idx ON public.student_requirement_checks USING btree (user_id, requirement_id);


--
-- Name: user_roles_user_id_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_roles_user_id_role_idx ON public.user_roles USING btree (user_id, role);


--
-- Name: anthropometric_evaluations anthropometric_evaluations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anthropometric_evaluations
    ADD CONSTRAINT anthropometric_evaluations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: belt_applications belt_applications_target_belt_id_belt_definitions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_applications
    ADD CONSTRAINT belt_applications_target_belt_id_belt_definitions_id_fk FOREIGN KEY (target_belt_id) REFERENCES public.belt_definitions(id);


--
-- Name: belt_applications belt_applications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_applications
    ADD CONSTRAINT belt_applications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: belt_exams belt_exams_belt_id_belt_definitions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_exams
    ADD CONSTRAINT belt_exams_belt_id_belt_definitions_id_fk FOREIGN KEY (belt_id) REFERENCES public.belt_definitions(id);


--
-- Name: belt_history belt_history_belt_id_belt_definitions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_history
    ADD CONSTRAINT belt_history_belt_id_belt_definitions_id_fk FOREIGN KEY (belt_id) REFERENCES public.belt_definitions(id);


--
-- Name: belt_history belt_history_promoted_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_history
    ADD CONSTRAINT belt_history_promoted_by_users_id_fk FOREIGN KEY (promoted_by) REFERENCES public.users(id);


--
-- Name: belt_history belt_history_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_history
    ADD CONSTRAINT belt_history_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: belt_requirements belt_requirements_belt_id_belt_definitions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.belt_requirements
    ADD CONSTRAINT belt_requirements_belt_id_belt_definitions_id_fk FOREIGN KEY (belt_id) REFERENCES public.belt_definitions(id);


--
-- Name: challenges challenges_cancel_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_cancel_requested_by_fkey FOREIGN KEY (cancel_requested_by) REFERENCES public.users(id);


--
-- Name: challenges challenges_challenged_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_challenged_id_fkey FOREIGN KEY (challenged_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: challenges challenges_challenger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_challenger_id_fkey FOREIGN KEY (challenger_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: challenges challenges_training_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_training_system_id_fkey FOREIGN KEY (training_system_id) REFERENCES public.training_systems(id);


--
-- Name: challenges challenges_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.users(id);


--
-- Name: class_attendances class_attendances_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_attendances
    ADD CONSTRAINT class_attendances_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: class_attendances class_attendances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_attendances
    ADD CONSTRAINT class_attendances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: class_training_systems class_training_systems_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_training_systems
    ADD CONSTRAINT class_training_systems_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: class_training_systems class_training_systems_training_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_training_systems
    ADD CONSTRAINT class_training_systems_training_system_id_fkey FOREIGN KEY (training_system_id) REFERENCES public.training_systems(id) ON DELETE CASCADE;


--
-- Name: classes classes_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: classes classes_professor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_professor_user_id_fkey FOREIGN KEY (professor_user_id) REFERENCES public.users(id);


--
-- Name: event_attendees event_attendees_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_attendees event_attendees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_attendees
    ADD CONSTRAINT event_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: events events_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: exercise_categories exercise_categories_training_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exercise_categories
    ADD CONSTRAINT exercise_categories_training_system_id_fkey FOREIGN KEY (training_system_id) REFERENCES public.training_systems(id) ON DELETE CASCADE;


--
-- Name: exercises exercises_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: exercises exercises_exercise_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_exercise_category_id_fkey FOREIGN KEY (exercise_category_id) REFERENCES public.exercise_categories(id) ON DELETE SET NULL;


--
-- Name: exercises exercises_training_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_training_system_id_fkey FOREIGN KEY (training_system_id) REFERENCES public.training_systems(id) ON DELETE CASCADE;


--
-- Name: fights fights_registered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_registered_by_users_id_fk FOREIGN KEY (registered_by) REFERENCES public.users(id);


--
-- Name: fights fights_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fights
    ADD CONSTRAINT fights_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: knowledge_categories knowledge_categories_training_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_categories
    ADD CONSTRAINT knowledge_categories_training_system_id_fkey FOREIGN KEY (training_system_id) REFERENCES public.training_systems(id) ON DELETE CASCADE;


--
-- Name: knowledge_items knowledge_items_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_items
    ADD CONSTRAINT knowledge_items_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: knowledge_items knowledge_items_knowledge_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_items
    ADD CONSTRAINT knowledge_items_knowledge_category_id_fkey FOREIGN KEY (knowledge_category_id) REFERENCES public.knowledge_categories(id) ON DELETE SET NULL;


--
-- Name: knowledge_items knowledge_items_training_system_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_items
    ADD CONSTRAINT knowledge_items_training_system_id_fkey FOREIGN KEY (training_system_id) REFERENCES public.training_systems(id) ON DELETE CASCADE;


--
-- Name: notification_reads notification_reads_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id);


--
-- Name: notification_reads notification_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id);


--
-- Name: payment_history payment_history_registered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.users(id);


--
-- Name: payment_history payment_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profesor_students profesor_students_alumno_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profesor_students
    ADD CONSTRAINT profesor_students_alumno_id_users_id_fk FOREIGN KEY (alumno_id) REFERENCES public.users(id);


--
-- Name: profesor_students profesor_students_profesor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profesor_students
    ADD CONSTRAINT profesor_students_profesor_id_users_id_fk FOREIGN KEY (profesor_id) REFERENCES public.users(id);


--
-- Name: push_tokens push_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_belt_unlocks student_belt_unlocks_target_belt_id_belt_definitions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_belt_unlocks
    ADD CONSTRAINT student_belt_unlocks_target_belt_id_belt_definitions_id_fk FOREIGN KEY (target_belt_id) REFERENCES public.belt_definitions(id);


--
-- Name: student_belt_unlocks student_belt_unlocks_unlocked_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_belt_unlocks
    ADD CONSTRAINT student_belt_unlocks_unlocked_by_users_id_fk FOREIGN KEY (unlocked_by) REFERENCES public.users(id);


--
-- Name: student_belt_unlocks student_belt_unlocks_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_belt_unlocks
    ADD CONSTRAINT student_belt_unlocks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: student_belts student_belts_current_belt_id_belt_definitions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_belts
    ADD CONSTRAINT student_belts_current_belt_id_belt_definitions_id_fk FOREIGN KEY (current_belt_id) REFERENCES public.belt_definitions(id);


--
-- Name: student_belts student_belts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_belts
    ADD CONSTRAINT student_belts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: student_requirement_checks student_requirement_checks_requirement_id_belt_requirements_id_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_requirement_checks
    ADD CONSTRAINT student_requirement_checks_requirement_id_belt_requirements_id_ FOREIGN KEY (requirement_id) REFERENCES public.belt_requirements(id);


--
-- Name: student_requirement_checks student_requirement_checks_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_requirement_checks
    ADD CONSTRAINT student_requirement_checks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict U3IkJ6PL2EjCrxJcugCHOF8QdS8fxocCzx2tF0SVR31IJSVUVRFDWVyuUOVYfJ9

