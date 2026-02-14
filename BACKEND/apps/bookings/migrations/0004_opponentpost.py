# Generated manually for opponent finder feature

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0003_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='OpponentPost',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('location', models.CharField(max_length=255)),
                ('preferred_date', models.DateField()),
                ('preferred_start_time', models.TimeField()),
                ('preferred_end_time', models.TimeField()),
                ('skill_level', models.CharField(choices=[('casual', 'Casual'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')], default='casual', max_length=20)),
                ('notes', models.CharField(blank=True, max_length=400)),
                ('status', models.CharField(choices=[('open', 'Open'), ('matched', 'Matched'), ('closed', 'Closed')], default='open', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('matched_with', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='matched_opponent_posts', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='opponent_posts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Opponent Post',
                'verbose_name_plural': 'Opponent Posts',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='opponentpost',
            index=models.Index(fields=['status', 'preferred_date'], name='bookings_op_status_1dcd61_idx'),
        ),
        migrations.AddIndex(
            model_name='opponentpost',
            index=models.Index(fields=['user', '-created_at'], name='bookings_op_user_id_4a6ef6_idx'),
        ),
    ]
