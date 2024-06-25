"use strict";

let options = {};
if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA; // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "Group_Members",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        userId: {
          type: Sequelize.INTEGER,
          references: {
            model: "Users",
          },
          onDelete: "CASCADE",
        },
        groupId: {
          type: Sequelize.INTEGER,
          references: {
            model: "Groups",
          },
          onDelete: "CASCADE",
        },
        role: {
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
    options.tableName = "Group_Members";
    await queryInterface.addIndex(options, ["userId", "groupId"], {
      unique: true,
      name: "idx_group_member_userId_groupId"
    });
  },
  async down(queryInterface, Sequelize) {
    options.tableName = "Group_Members";
    await queryInterface.dropTable(options);
    await queryInterface.removeIndex(options, "idx_group_member_userId_groupId");
  },
};
