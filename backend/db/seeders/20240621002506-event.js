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

    await Event.create({
      groupId: 1,
      venueId: 1,
      name: "this place",
      type: "Online",
      startDate: "2025-11-19 20:00:00",
      endDate: "2025-11-19 22:00:00",
      capacity: 15,
      price: 10.0,
      previewImage: null,
    });
    await Event.create({
      groupId: 2,
      venueId: 2,
      name: "this place",
      type: "In person",
      startDate: "2025-11-19 20:00:00",
      endDate: "2025-11-19 22:00:00",
      capacity: 15,
      price: 10.0,
      previewImage: null,
    });
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
