"use strict";

const { Event_Image } = require("../models");

const options = {};

if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */

    await Event_Image.bulkCreate(
      [
        { eventId: 1, imageId: 1 },
        { eventId: 1, imageId: 2 },
        { eventId: 2, imageId: 1 },
        { eventId: 2, imageId: 2 },
      ],
      { validate: true }
    );
  },

  async down(queryInterface, Sequelize) {
    options.tableName = "Event_Images";

    await queryInterface.bulkDelete(options, {
      id: { [Sequelize.Op.in]: [1, 2,3,4] },
    });
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
