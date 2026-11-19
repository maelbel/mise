CREATE TYPE "public"."difficulty" AS ENUM('Easy', 'Medium', 'Hard');--> statement-breakpoint
CREATE TYPE "public"."meal_slot" AS ENUM('breakfast', 'lunch', 'dinner');--> statement-breakpoint
CREATE TYPE "public"."unit" AS ENUM('g', 'mL', 'pcs', 'tbsp');--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"shelf" text NOT NULL,
	"unit" "unit" NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ingredients_name_unique" UNIQUE("name"),
	CONSTRAINT "ingredients_price_positive" CHECK ("ingredients"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "meal_plan_slots" (
	"week_start" date NOT NULL,
	"day" smallint NOT NULL,
	"slot" "meal_slot" NOT NULL,
	"recipe_id" integer,
	"portions" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "meal_plan_slots_week_start_day_slot_pk" PRIMARY KEY("week_start","day","slot"),
	CONSTRAINT "meal_plan_slots_day_range" CHECK ("meal_plan_slots"."day" BETWEEN 0 AND 6),
	CONSTRAINT "meal_plan_slots_portions_range" CHECK ("meal_plan_slots"."portions" BETWEEN 1 AND 4)
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"recipe_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"quantity" double precision NOT NULL,
	CONSTRAINT "recipe_ingredients_recipe_id_ingredient_id_pk" PRIMARY KEY("recipe_id","ingredient_id"),
	CONSTRAINT "recipe_ingredients_quantity_positive" CHECK ("recipe_ingredients"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"time_min" integer NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"kcal" integer NOT NULL,
	"protein" integer NOT NULL,
	"carbs" integer NOT NULL,
	"fat" integer NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"diet" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "recipes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "shopping_checks" (
	"week_start" date NOT NULL,
	"ingredient_id" integer NOT NULL,
	CONSTRAINT "shopping_checks_week_start_ingredient_id_pk" PRIMARY KEY("week_start","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "stock" (
	"ingredient_id" integer PRIMARY KEY NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL,
	CONSTRAINT "stock_quantity_positive" CHECK ("stock"."quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "meal_plan_slots" ADD CONSTRAINT "meal_plan_slots_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_checks" ADD CONSTRAINT "shopping_checks_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;