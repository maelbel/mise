CREATE TYPE "public"."goal" AS ENUM('lose', 'maintain', 'gain');--> statement-breakpoint
CREATE TYPE "public"."pace" AS ENUM('slow', 'normal', 'fast');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'unspecified');--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"sex" "sex",
	"birth_date" date,
	"height_cm" double precision,
	"weight_kg" double precision,
	"activity" smallint,
	"goal" "goal" DEFAULT 'maintain' NOT NULL,
	"pace" "pace" DEFAULT 'normal' NOT NULL,
	"diet" text[] DEFAULT '{}'::text[] NOT NULL,
	"avoid" text[] DEFAULT '{}'::text[] NOT NULL,
	"weekday_max_minutes" integer,
	"weekly_budget_cents" integer,
	"target_kcal" integer,
	"target_protein" integer,
	"target_carbs" integer,
	"target_fat" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_activity_range" CHECK ("profiles"."activity" BETWEEN 0 AND 4)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"disabled_at" timestamp with time zone,
	"session_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
-- Data written before accounts existed gets an owner: a placeholder admin
-- without a password (it cannot log in). `npm run user:create -- --admin`
-- turns it into the real admin account, which keeps all that data.
INSERT INTO "users" ("email", "name", "is_admin", "must_change_password")
SELECT 'owner@mise.invalid', 'Owner', true, false
WHERE EXISTS (SELECT 1 FROM "ingredients") OR EXISTS (SELECT 1 FROM "recipes") OR EXISTS (SELECT 1 FROM "meal_plan_slots");--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD COLUMN "user_id" integer;--> statement-breakpoint
UPDATE "ingredients" SET "user_id" = (SELECT min("id") FROM "users");--> statement-breakpoint
UPDATE "recipes" SET "user_id" = (SELECT min("id") FROM "users");--> statement-breakpoint
UPDATE "meal_plan_slots" SET "user_id" = (SELECT min("id") FROM "users");--> statement-breakpoint
ALTER TABLE "ingredients" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_name_unique";--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_name_unique";--> statement-breakpoint
ALTER TABLE "meal_plan_slots" DROP CONSTRAINT "meal_plan_slots_week_start_day_slot_pk";--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD CONSTRAINT "meal_plan_slots_user_id_week_start_day_slot_pk" PRIMARY KEY("user_id","week_start","day","slot");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD CONSTRAINT "meal_plan_slots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shopping_checks_ingredient_idx" ON "shopping_checks" USING btree ("ingredient_id");--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_user_name_unique" UNIQUE("user_id","name");--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_name_unique" UNIQUE("user_id","name");
