import datetime as dt

import app.models as models


def test_create_claim_with_relationships(db_session):
    user = models.User(
        name="Test Client",
        email=f"client_{dt.datetime.now().timestamp()}@example.com",
        password_hash="x",
        role="client",
    )
    db_session.add(user)
    db_session.flush()

    policy = models.Policy(
        policy_number=f"PA-{int(dt.datetime.now().timestamp())}",
        holder_id=user.id,
        coverage="Comprehensive",
        deductible=500,
        annual_premium=1200,
        state="OH",
        status="active",
    )
    db_session.add(policy)
    db_session.flush()

    claim = models.Claim(
        claim_ref=f"CLM-{int(dt.datetime.now().timestamp())}",
        policy_id=policy.id,
        client_id=user.id,
        policy_holder="Test Client",
        incident_date=dt.date(2024, 10, 28),
        filed_date=dt.date(2024, 10, 28),
        incident_type="Multi-Vehicle Collision",
        collision_type="Rear-end Impact",
        severity="Minor Damage",
        vehicle="2022 Honda Accord",
        auto_make="Honda",
        auto_model="Accord",
        auto_year="2022",
        damage_estimate=4850,
        vehicle_claim=4850,
        injury_claim=0,
        property_claim=500,
        status="Submitted",
        status_note="Filed.",
        police_report=True,
        authorities_contacted="Police",
        witnesses=1,
        state="OH",
        city="Columbus",
    )
    db_session.add(claim)
    db_session.flush()

    doc = models.ClaimDocument(
        claim_id=claim.id,
        uploader_id=user.id,
        stored_filename="abc123.jpg",
        original_name="photo.jpg",
        mime_type="image/jpeg",
        size_bytes=1024,
        kind="image",
        sha256="deadbeef",
    )
    hist = models.ClaimStatusHistory(
        claim_id=claim.id,
        from_status=None,
        to_status="Submitted",
        actor_id=user.id,
        reason="Initial filing",
    )
    db_session.add_all([doc, hist])
    db_session.flush()

    reloaded = db_session.get(models.Claim, claim.id)
    assert reloaded.client.email == user.email
    assert reloaded.policy.policy_number == policy.policy_number
    assert reloaded.documents[0].sha256 == "deadbeef"
    assert reloaded.status_history[0].to_status == "Submitted"


def test_no_notifications_model():
    assert not hasattr(models, "Notification")
