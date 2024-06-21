"use strict";

const { Event } = require("../models");

let options = {};
if (process.env.NODE_ENV === "production") {
  options.schema = process.env.SCHEMA; // define your schema in options object
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
    await Event.bulkCreate(
      [
        {
          groupId: 1,
          venueId: 1,
          name: "this place",
          type: "church",
          startDate: Date.now(),
          endDate: Date.now(),
          numAttanding: 15,
          previewImage: null,
        },
        {
          groupId: 1,
          venueId: 1,
          name: "this place",
          type: "church",
          startDate: Date.now(),
          endDate: Date.now(),
          numAttanding: 15,
          previewImage: null,
        },
      ],
      { validate: true }
    );
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    options.tableName = "Events";
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(
      options,
      {
        id: { [Op.in]: [1, 2] },
      },
      {}
    );
  },
};
