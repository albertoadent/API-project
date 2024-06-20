"use strict";

let options = {};
if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA; // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    options.tableName = "Users";
    await queryInterface.addIndex(options, ["firstName", "lastName"], {
      unique: true,
      name: 'idx_users_first_last_name_unique'
    });
  },
  
  async down(queryInterface, Sequelize) {
    options.tableName = "Users";
    await queryInterface.removeIndex(options, name: 'idx_users_first_last_name_unique');
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
