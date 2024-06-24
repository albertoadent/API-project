"use strict";

const { Event_Member } = require("../models");

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

    await Event_Member.create({ groupMemberId: 1, eventId: 1 });
    await Event_Member.create({ groupMemberId: 2, eventId: 1 });
    await Event_Member.create({ groupMemberId: 2, eventId: 2 });
  },

  async down(queryInterface, Sequelize) {
    options.tableName = "Event_Members";

    await queryInterface.bulkDelete(options, {
      id: { [Sequelize.Op.in]: [1, 2] },
    });

    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
