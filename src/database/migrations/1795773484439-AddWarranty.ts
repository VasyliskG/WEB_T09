import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWarranty1795773484439 implements MigrationInterface {
  name = 'AddWarranty1795773484439';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "warranties" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "durationMonths" integer NOT NULL, "conditions" text NOT NULL, "gadget_id" uuid NOT NULL, CONSTRAINT "REL_66bb47d38839164f08ac800fad" UNIQUE ("gadget_id"), CONSTRAINT "PK_62c441630f8a6ddcc4bc1ab1bc5" PRIMARY KEY ("id"))`,
    );
    // Ручне доповнення: переносимо наявні гарантійні терміни у нову таблицю,
    // щоб DROP COLUMN не призвів до втрати даних.
    await queryRunner.query(
      `INSERT INTO "warranties" ("durationMonths", "conditions", "gadget_id") SELECT "warrantyMonths", 'Стандартна гарантія виробника', "id" FROM "gadgets"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gadgets" DROP COLUMN "warrantyMonths"`,
    );
    await queryRunner.query(
      `ALTER TABLE "warranties" ADD CONSTRAINT "FK_66bb47d38839164f08ac800fadb" FOREIGN KEY ("gadget_id") REFERENCES "gadgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "warranties" DROP CONSTRAINT "FK_66bb47d38839164f08ac800fadb"`,
    );
    // Ручне доповнення: повертаємо термін гарантії в колонку gadgets
    // (для гаджетів без гарантії — 12 міс. за замовчуванням).
    await queryRunner.query(
      `ALTER TABLE "gadgets" ADD "warrantyMonths" integer NOT NULL DEFAULT 12`,
    );
    await queryRunner.query(
      `UPDATE "gadgets" g SET "warrantyMonths" = w."durationMonths" FROM "warranties" w WHERE w."gadget_id" = g."id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "gadgets" ALTER COLUMN "warrantyMonths" DROP DEFAULT`,
    );
    await queryRunner.query(`DROP TABLE "warranties"`);
  }
}
