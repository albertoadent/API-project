"use strict";
const options = {};
if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Events",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        groupId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "Groups",
          },
          onDelete: "CASCADE",
        },
        venueId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "Venues",
          },
          onDelete: "CASCADE",
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        type: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        description: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "none",
        },
        startDate: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        endDate: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        capacity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        price:{
          type: Sequelize.DECIMAL,
          allowNull:false
        },
        numAttending: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false,
        },
        previewImage: {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: null,
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
    options.tableName = "Events";
    await queryInterface.dropTable(options);
  },
};
