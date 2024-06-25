"use strict";

const options = {};

if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Event_Members",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        groupMemberId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Group_Members" },
          onDelete: "CASCADE",
        },
        eventId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Events" },
          onDelete: "CASCADE",
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "pending",
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
    options.tableName = "Event_Members";
    await queryInterface.addIndex(options, ["eventId", "groupMemberId"], {
      unique: true,
      name: "idx_group_member_eventId_groupMemberId",
    });
  },
  async down(queryInterface, Sequelize) {
    options.tableName = "Event_Members";
    await queryInterface.dropTable(options);
    await queryInterface.removeIndex(
      options,
      "idx_group_member_eventId_groupMemberId"
    );
  },
};
