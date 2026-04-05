from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('futsals', '0003_futsal_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='futsal',
            name='amenities',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
