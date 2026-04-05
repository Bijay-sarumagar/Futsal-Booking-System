from datetime import date, timedelta, time

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.futsals.models import Futsal, TimeSlot


class Command(BaseCommand):
    help = "Seed demo owners, futsals, and slots for UI testing"

    def handle(self, *args, **options):
        User = get_user_model()

        demo_rows = [
            {
                "username": "owner.kathmandu",
                "email": "owner.kathmandu@futsalhub.local",
                "first_name": "Ram",
                "last_name": "Shrestha",
                "phone": "+9779800000001",
                "futsal_name": "Kathmandu Arena",
                "location": "Baneshwor, Kathmandu",
                "latitude": "27.6915",
                "longitude": "85.3420",
                "description": "Premium indoor turf with parking, shower rooms, and cafeteria. Popular for evening leagues.",
            },
            {
                "username": "owner.patandome",
                "email": "owner.patandome@futsalhub.local",
                "first_name": "Sita",
                "last_name": "Gurung",
                "phone": "+9779800000002",
                "futsal_name": "Patan Dome Futsal",
                "location": "Pulchowk, Lalitpur",
                "latitude": "27.6788",
                "longitude": "85.3188",
                "description": "Covered dome futsal with floodlights and changing rooms. Suitable for all-weather matches.",
            },
            {
                "username": "owner.bhaktapurkick",
                "email": "owner.bhaktapurkick@futsalhub.local",
                "first_name": "Anish",
                "last_name": "Maharjan",
                "phone": "+9779800000003",
                "futsal_name": "Bhaktapur Kick Arena",
                "location": "Suryabinayak, Bhaktapur",
                "latitude": "27.6710",
                "longitude": "85.4298",
                "description": "Community-friendly futsal with clean rest area, drinking water, and family parking zone.",
            },
            {
                "username": "owner.pokharasports",
                "email": "owner.pokharasports@futsalhub.local",
                "first_name": "Bikash",
                "last_name": "Tamang",
                "phone": "+9779800000004",
                "futsal_name": "Pokhara Sports Hub",
                "location": "Lakeside, Pokhara",
                "latitude": "28.2096",
                "longitude": "83.9856",
                "description": "Lakeside multi-sport venue with premium synthetic grass and mountain-view stands.",
            },
            {
                "username": "owner.chitwanpark",
                "email": "owner.chitwanpark@futsalhub.local",
                "first_name": "Deepak",
                "last_name": "Thapa",
                "phone": "+9779800000005",
                "futsal_name": "Chitwan Futsal Park",
                "location": "Bharatpur, Chitwan",
                "latitude": "27.6833",
                "longitude": "84.4333",
                "description": "Spacious modern court with first-aid support and flexible hourly pricing for local clubs.",
            },
        ]

        created_futsals = 0
        created_slots = 0

        for row in demo_rows:
            owner, owner_created = User.objects.get_or_create(
                username=row["username"],
                defaults={
                    "email": row["email"],
                    "first_name": row["first_name"],
                    "last_name": row["last_name"],
                    "phone": row["phone"],
                    "role": "owner",
                    "status": "active",
                    "is_staff": False,
                },
            )

            if owner_created:
                owner.set_password("owner12345")
                owner.save(update_fields=["password"])

            futsal, futsal_created = Futsal.objects.get_or_create(
                owner=owner,
                futsal_name=row["futsal_name"],
                defaults={
                    "location": row["location"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "description": row["description"],
                    "approval_status": "approved",
                },
            )

            if not futsal_created:
                futsal.location = row["location"]
                futsal.latitude = row["latitude"]
                futsal.longitude = row["longitude"]
                futsal.description = row["description"]
                futsal.approval_status = "approved"
                futsal.save(update_fields=["location", "latitude", "longitude", "description", "approval_status", "updated_at"])
            else:
                created_futsals += 1

            for day_offset in range(0, 5):
                slot_date = date.today() + timedelta(days=day_offset)
                for start_hour, end_hour, price in [
                    (7, 8, 1200),
                    (16, 17, 1500),
                    (18, 19, 1800),
                    (20, 21, 1700),
                ]:
                    _, slot_created = TimeSlot.objects.get_or_create(
                        futsal=futsal,
                        slot_date=slot_date,
                        start_time=time(start_hour, 0),
                        defaults={
                            "end_time": time(end_hour, 0),
                            "price": price,
                            "availability_status": "available",
                        },
                    )
                    if slot_created:
                        created_slots += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seed complete: {len(demo_rows)} owners ready, {created_futsals} futsals created, {created_slots} slots created."
        ))
        self.stdout.write(self.style.WARNING("Default demo owner password: owner12345"))
