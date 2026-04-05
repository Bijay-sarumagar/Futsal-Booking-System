from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('futsals', '0004_futsal_amenities'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='timeslot',
            unique_together={('futsal', 'slot_date', 'start_time', 'end_time')},
        ),
    ]
