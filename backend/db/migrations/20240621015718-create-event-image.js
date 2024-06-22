"use strict";

const options = {};

if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Event_Images",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        imageId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Images" },
          onDelete:"CASCADE"
        },
        eventId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Events" },
          onDelete:"CASCADE"
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      },
      options
    );
  },
  async down(queryInterface, Sequelize) {
    options.tableName = "Event_Images";
    await queryInterface.dropTable(options);
  },
};
