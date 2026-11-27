import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRelations1795773372270 implements MigrationInterface {
  name = 'CreateRelations1795773372270';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "gadgets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "slug" character varying(180) NOT NULL, "price" numeric(10,2) NOT NULL, "warrantyMonths" integer NOT NULL, "cpu" character varying(100), "ramGb" integer, "isAvailable" boolean NOT NULL DEFAULT true, "stock" integer NOT NULL DEFAULT '0', "description" character varying(500), "brand_id" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_cdf8116792b84dececf13ce72aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "brands" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "country" character varying(80), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_96db6bbbaa6f23cad26871339b6" UNIQUE ("name"), CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('CONFIRMED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("orderId" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL, "productTitle" character varying(150) NOT NULL, "productSlug" character varying(180) NOT NULL, "unitPrice" numeric(10,2) NOT NULL, "quantity" integer NOT NULL, "subtotal" numeric(12,2) NOT NULL, "taxAmount" numeric(12,2) NOT NULL, "total" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'CONFIRMED', "customerEmail" character varying(100) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_41ba27842ac1a2c24817ca59eaa" PRIMARY KEY ("orderId"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "gadgets" ADD CONSTRAINT "FK_d9a637fbc85ae998c7b85f250b2" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "gadgets" DROP CONSTRAINT "FK_d9a637fbc85ae998c7b85f250b2"`,
    );
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.query(`DROP TABLE "brands"`);
    await queryRunner.query(`DROP TABLE "gadgets"`);
  }
}
